import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "量子白羊的博客记事本",
	subtitle: "记录思考，留存灵感", // 换了一个更实用的副标题
	lang: "zh_CN",
	themeColor: {
		hue: 220,
		fixed: false, 
	},
	banner: {
		enable: false, 
		src: "assets/images/demo-banner.png",
		position: "center",
		credit: {
			enable: false,
			text: "",
			url: "",
		},
	},
	toc: {
		enable: true, 
		depth: 2,
	},
	favicon: [],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "Gitee",
			url: "https://gitee.com/DreamKerman-aries",
			external: true,
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/logo.png",
	name: "量子白羊",
	bio: "向最美还的前途，那怕是漫长的路。", 
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/lzby-42",
		},
		{
			name: "Gitee",
			icon: "simple-icons:gitee", 
			url: "https://gitee.com/DreamKerman-aries",
		},
		{
			name: "Email",
			icon: "fa6-solid:envelope",
			url: "mailto:2829478110@qq.com",
		},
		{
			name: "QQ",
			icon: "fa6-brands:qq",
			url: "tencent://AddContact/?fromId=45&fromSubId=1&subcmd=all&uin=2829478110",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	theme: "github-dark", 
};
