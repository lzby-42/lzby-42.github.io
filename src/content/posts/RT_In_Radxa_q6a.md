---
title: 构建与引导 Radxa 实时内核完全记录
published: 2024-11-30
description: 为嵌入式设备构建实时内核，是配置管理与引导理解的双重挑战。本指南源自一次从环境搭建到引导成功的完整实战，特别适合 Radxa 等嵌入式开发板。
tags: [Linux, 嵌入式开发, Radxa, 实时内核, PREEMPT_RT, 内核构建]
category: 技术指南
draft: true
---

> **核心提示**：为嵌入式设备构建实时内核，是**配置管理**与**引导理解**的双重挑战。本记录源自一次从环境搭建到引导成功的完整实战，用于 **Radxa Dragon q6a** 嵌入式开发板。

## **核心概念与准备工作**

### 1. 实时内核状态与项目结构

#### **实时内核的现状**
自 Linux 6.12 起，`PREEMPT_RT` 补丁集已正式合并入内核主线。这意味着：

- **无需再寻找独立补丁文件**：实时功能已是内核源码的一部分。
- **通过配置启用**：只需在内核配置中开启 `CONFIG_PREEMPT_RT` 选项。
- **构建更简单**：消除了版本匹配和打补丁步骤。

#### **典型项目结构分析**
以典型的 Radxa 内核构建项目为例，理解其配置系统至关重要：

```bash
project/
├── src/                          # 内核源码目录
│   ├── arch/arm64/configs/       # ARM64架构特定配置
│   │   ├── defconfig             # 基础架构配置
│   │   ├── qcom_module.config    # QCOM模块配置
│   │   ├── radxa.config          # Radxa板级配置
│   │   └── radxa_custom.config   # 自定义硬件配置
│   └── kernel/Kconfig.preempt    # 抢占模型配置定义
├── .github/local/Makefile.local  # 自定义构建规则（关键文件）
├── patches/                      # 补丁目录（旧方式）
└── Makefile                      # 主构建脚本
```

**配置合并顺序**由 `KERNEL_DEFCONFIG` 变量控制，通常按以下优先级递增：

```makefile
KERNEL_DEFCONFIG := defconfig qcom_module.config radxa.config radxa_custom.config
```

### 2. 配置实时内核的完整依赖链

`PREEMPT_RT` 的启用不是单一开关，而是一组**必须同时满足**的条件：

```bash
CONFIG_PREEMPT_RT=y                # 目标：启用实时抢占
CONFIG_EXPERT=y                    # 必需：启用专家模式
CONFIG_ARCH_SUPPORTS_RT=y          # 必需：架构支持RT
CONFIG_COMPILE_TEST=n              # 必需：禁用编译测试
# CONFIG_PREEMPT is not set       # 互斥：禁用标准可抢占
# CONFIG_PREEMPT_VOLUNTARY is not set # 互斥：禁用自愿抢占
# CONFIG_PREEMPT_NONE is not set  # 互斥：禁用无抢占
```

## **实战配置流程**

### 步骤1：创建最小配置片段

不要直接使用 `menuconfig` 生成的完整 `.config` 文件作为配置片段，这会覆盖硬件特定设置。应该创建**只包含必要修改**的最小文件，就像这样：

```bash
# 在 src/arch/arm64/configs/ 目录下创建 RTtext.config
cat > RTtext.config << 'EOF'
# 启用 PREEMPT_RT 及其所有强制依赖
CONFIG_PREEMPT_RT=y
CONFIG_EXPERT=y
CONFIG_ARCH_SUPPORTS_RT=y
CONFIG_COMPILE_TEST=n

# 禁用所有其他抢占模型（互斥）
CONFIG_PREEMPT=n
CONFIG_PREEMPT_VOLUNTARY=n
CONFIG_PREEMPT_NONE=n

# （可选）启用启动时选择，增加灵活性
CONFIG_PREEMPT_BOOT=y
EOF
```

### 步骤2：更新构建配置文件

在 `.github/local/Makefile.local` 中确保配置片段被包含：

```makefile
# 将自定义配置片段添加到合并列表末尾
KERNEL_DEFCONFIG := defconfig qcom_module.config radxa.config radxa_custom.config RTtext.config
```

### 步骤3：执行构建

```bash
# 清理并构建
make clean-build
make build
```

## **常见的疑难问题与解决方案**

### 问题1：`menuconfig` 中找不到 `PREEMPT_RT` 选项

**症状**：在 `General setup -> Preemption Model` 中只有常规选项，没有 `Fully Preemptible Kernel (Real-Time)`。

**原因与解决**：

1. **检查依赖是否满足**：

   ```bash
   grep -E "CONFIG_EXPERT|CONFIG_ARCH_SUPPORTS_RT|CONFIG_COMPILE_TEST" .config
   ```

   必须确保 `CONFIG_EXPERT=y` 和 `CONFIG_ARCH_SUPPORTS_RT=y`。

2. **检查硬件配置覆盖**：

   ```bash
   grep -i "CONFIG_PREEMPT" src/arch/arm64/configs/radxa*.config
   ```

   硬件配置可能强制设置了其他抢占模型，导致RT选项被隐藏。取消这些设置或确保你的 `RTtext.config` 在合并顺序中位于最后。

### 问题2：配置正确但编译后不生效

**症状**：`.config` 文件中有 `CONFIG_PREEMPT_RT=y`，但生成的 `.deb` 包中找不到此配置。

**诊断方法**：

```bash
# 检查配置合并后的状态
make build-defconfig
cd src && grep CONFIG_PREEMPT_RT .config

# 检查构建过程中是否有 olddefconfig 覆盖
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- olddefconfig
grep CONFIG_PREEMPT_RT .config
```

**解决方案**：如果 `olddefconfig` 覆盖了配置，确保你的配置片段使用 `=y`/`=n` 格式而非 `# ... is not set` 注释格式，这更能抵抗覆盖。

### 问题3：引导器忽略配置，始终启动旧内核

这是最复杂的情况，通常涉及引导系统本身的配置。根据本指南经验，Radxa 设备可能使用 **`sdboot`** 而非传统 U-Boot。

**诊断步骤**：

1. **检查引导文件位置**：

   ```bash
   ls -la /boot/extlinux/extlinux.conf
   ls -la /boot/efi/loader/entries/
   ```

2. **查看引导日志**（如有串口）或观察启动时屏幕输出。

**解决方案流程**：

```bash
# 1. 定位并修复引导配置文件
# 通常是 /boot/efi/loader/entries/RadxaOS-<版本>-qcom.conf
sudo nano /boot/efi/loader/entries/RadxaOS-6.17.1-4-qcom.conf

# 2. 修复常见语法错误（如空指令行）
# 原文件可能有：devicetree-overlay（空行）
# 修改为注释或删除： # devicetree-overlay

# 3. 修改标题以便在菜单中区分
# 将 title Ubuntu 24.04.3 LTS
# 改为：title Ubuntu 24.04.3 LTS (6.17.1-4-qcom RT)

# 4. 设置默认引导项
echo "default RadxaOS-6.17.1-4-qcom" | sudo tee /boot/efi/loader/loader.conf
```

## **构建与引导问题排查矩阵**

| 问题现象 | 可能原因 | 检查点 | 解决方案 |
|---------|---------|-------|---------|
| 编译失败，提示架构不支持 | 缺少跨架构支持 | `binfmt_misc` 是否安装 | 安装 `qemu-user-static` |
| `menuconfig` 无RT选项 | 依赖不满足 | `.config` 中 `EXPERT` 和 `ARCH_SUPPORTS_RT` | 确保配置片段设置这些依赖 |
| 构建成功但包内无RT配置 | 配置被后续步骤覆盖 | 构建日志中是否有 `olddefconfig` | 使用 `scripts/config` 工具强制设置 |
| 系统仍从旧内核启动 | 引导配置错误 | 检查 `/boot/extlinux/extlinux.conf` 和 `/boot/efi/loader/` | 修复引导配置文件，设置默认项 |

## **最终验证与测试**

### 内核验证

```bash
# 检查正在运行的内核
uname -a
# 应输出：... 6.17.1-4-qcom #... SMP PREEMPT_RT ...

# 检查运行时配置
zcat /proc/config.gz | grep CONFIG_PREEMPT_RT
# 或
grep CONFIG_PREEMPT_RT /boot/config-$(uname -r)
```

### 性能测试

```bash
# 安装实时测试工具
sudo apt update && sudo apt install rt-tests

# 运行延迟测试
sudo cyclictest --duration=10s --priority=80 --interval=1000

# 观察输出中的 Max Latencies
# 实时内核通常应 < 100 微秒
```

## **总结与最佳实践**

1. **配置管理**：始终使用最小配置片段，避免覆盖硬件特定设置。
2. **依赖完整**：`PREEMPT_RT` 需要 `EXPERT` 和 `ARCH_SUPPORTS_RT` 同时启用。
3. **引导理解**：了解你的设备使用哪种引导器（U-Boot 或 sdboot），并熟悉其配置语法。
4. **验证彻底**：从构建产物（`.deb` 包）、引导菜单到运行时状态，多阶段验证。
5. **版本控制**：将配置片段和构建脚本纳入版本控制，确保可重复构建。

本记录仅个人实践经验，不仅能为 Radxa 设备构建实时内核，更重要的是掌握了嵌入式 Linux 内核配置与引导系统的核心调试方法。这些技能在嵌入式开发中具有普适价值。

---

> **经验之谈**：构建实时内核的挑战往往不在于打补丁或编译，而在于理解配置系统的依赖关系和引导流程的细节。耐心和系统性排查是成功的关键。

> **后日谈**：构建一个实时内核仅仅是项目的开始，构建好后的各种中断冲突，显卡驱动问题，网卡驱动问题都是等待待解决的。正确的方向会极大的减少开发的时间