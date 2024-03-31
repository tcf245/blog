export const THEME_CONFIG: App.Locals['config'] = {
  /** blog title */
  title: "个人空间",
  /** your name */
  author: "<Eric's Blog>",
  /** website description */
  desc: "Rediscory the beauty of typography",
  /** your deployed domain */
  website: "https://cyanbean.online/",
  /** your locale */
  locale: "en-us",
  /** theme style */
  themeStyle: "light",
  /** your socials */
  socials: [
    {
      name: "github",
      href: "https://github.com/tcf245",
    },
    // {
    //   name: "rss",
    //   href: "/atom.xml",
    // },
    {
      name: "twitter",
      href: "https://twitter.com/8ac06af466f94ab",
    },
    {
      name: "linkedin",
      href: "https://www.linkedin.com/in/eric-tan-498580b8/",
    }
  ],
  /** your header info */
  header: {
    twitter: "@moeyua13",
  },
  /** your navigation links */
  navs: [
    {
      name: "Posts",
      href: "/posts/page/1",
    },
    {
      name: "Archive",
      href: "/archive",
    },
    {
      name: "Categories",
      href: "/categories"
    },
    {
      name: "About",
      href: "/about",
    },
  ],
  /** your category name mapping, which the `path` will be shown in the url */
  category_map: [
    {name: "胡适", path: "hu-shi"},
  ]
}

