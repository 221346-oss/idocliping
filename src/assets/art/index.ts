// AUTO-GENERATED artwork registry (CDN pointers + blur placeholders).
import a_bg_dark_web_1080 from "./bg-dark-web-1080.webp.asset.json";
import a_bg_dark_web_1717 from "./bg-dark-web-1717.webp.asset.json";
import a_bg_light_web_1080 from "./bg-light-web-1080.webp.asset.json";
import a_bg_light_web_1704 from "./bg-light-web-1704.webp.asset.json";
import a_how_dark_mobile_1080 from "./how-dark-mobile-1080.webp.asset.json";
import a_how_dark_web_1080 from "./how-dark-web-1080.webp.asset.json";
import a_how_dark_web_1672 from "./how-dark-web-1672.webp.asset.json";
import a_how_light_mobile_1080 from "./how-light-mobile-1080.webp.asset.json";
import a_how_light_web_1080 from "./how-light-web-1080.webp.asset.json";
import a_how_light_web_1672 from "./how-light-web-1672.webp.asset.json";

export type Artwork = { srcset: string; src: string; width: number; height: number; blur: string };

export const ART = {
  "bg-dark-web": {
    srcset: `${a_bg_dark_web_1080.url} 1080w` + ", " + `${a_bg_dark_web_1717.url} 1717w`,
    src: a_bg_dark_web_1717.url,
    width: 1717, height: 916,
    blur: "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAACwAQCdASoQAAkAA4BaJQBadB6OcMdAAP715wGUxRJLia+mUEOxPlYmSWwCoNGJyVTHe6gAAAA=",
  },
  "bg-light-web": {
    srcset: `${a_bg_light_web_1080.url} 1080w` + ", " + `${a_bg_light_web_1704.url} 1704w`,
    src: a_bg_light_web_1704.url,
    width: 1704, height: 923,
    blur: "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACwAQCdASoQAAkAA4BaJQAAXQapVAAAAP73RqeQ/zwxI2YAm9wHwLtY5xekoAAA",
  },
  "how-dark-mobile": {
    srcset: `${a_how_dark_mobile_1080.url} 1080w`,
    src: a_how_dark_mobile_1080.url,
    width: 1024, height: 1536,
    blur: "data:image/webp;base64,UklGRpIAAABXRUJQVlA4IIYAAAAQBACdASoQABgAPu1iqU2ppaOiMAgBMB2JQAB8tEG+XEhvUbyYpAIg0AD+71T9vJ341R/AC1wrZ6KLHjCFO4aNrb+v4zhKEuZOpvdebgRaSHkEmX2CNgCgsoYfmBcE8++zUZq9eQagz+qR8xpmOY9R+VYVsqmL8tUV/OZS2kTzCRN7ningAA==",
  },
  "how-dark-web": {
    srcset: `${a_how_dark_web_1080.url} 1080w` + ", " + `${a_how_dark_web_1672.url} 1672w`,
    src: a_how_dark_web_1672.url,
    width: 1672, height: 941,
    blur: "data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAAAQAgCdASoQAAkAA4BaJZQCw7ED/PDwvnwAAP7zNqgQx0+gtcYzZ8/VVP8UaNPK8T6cjl0T7PXklnit3IV1j2cZqcJPMdJPeip/KgAA",
  },
  "how-light-mobile": {
    srcset: `${a_how_light_mobile_1080.url} 1080w`,
    src: a_how_light_mobile_1080.url,
    width: 1023, height: 1537,
    blur: "data:image/webp;base64,UklGRroAAABXRUJQVlA4IK4AAACQBACdASoQABgAPu1iqU2ppaOiMAgBMB2JYwC06dwLgYcFCbi9o4Z1rzRmYAAA/useLkrdhhuC7b6JCETOd+SNlM9+QAF5XjC7rTBO0j4rxtS4fZHbiTE0NTbMgKtaR3TYogVTl9oc9V9Ut1SkWaiJkSATNmSGkInlMROy4EXn64mKOP6FaNChDZFsoNm2k69zOdWIJ/1iKifawUeu3s67EXY7lbtjh18DAOdcAAA=",
  },
  "how-light-web": {
    srcset: `${a_how_light_web_1080.url} 1080w` + ", " + `${a_how_light_web_1672.url} 1672w`,
    src: a_how_light_web_1672.url,
    width: 1672, height: 941,
    blur: "data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAAAwAgCdASoQAAkAA4BaJZwAD4/MLlh3lYkMAAD+8nJjwRge/9SuuKGSmbzRWyjX+bU/Xm9kc3zxqy5T4rMEzg8dFRcqsNtJCyKvwRzFw2khHy9AwmgAAA==",
  },
} as const satisfies Record<string, Artwork>;

export type ArtKey = keyof typeof ART;

