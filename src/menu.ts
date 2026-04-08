export type Category = "정식" | "곁들임" | "음료";
export type BasicSideDish = (typeof basicSideDishOptions)[number];

export type MenuItem = {
  id: string;
  category: Category;
  name: string;
  price: number;
  badge?: string;
  image: string;
};

export const categories: Category[] = ["정식", "곁들임", "음료"];

export const basicSideDishOptions = [
  "깻잎 짱아찌",
  "김치",
  "콩나물 무침",
  "애호박 무침",
  "양파 짱아찌",
  "멸치 볶음",
  "어묵 볶음",
] as const;

export function isSetMenu(item: MenuItem) {
  return item.category === "정식";
}

export const menuItems: MenuItem[] = [
  {
    id: "kimchi-set",
    category: "정식",
    name: "김치찌개 정식",
    price: 10900,
    badge: "인기",
    image: new URL("../Photo/김치찌개 정식.png", import.meta.url).href,
  },
  {
    id: "doenjang-set",
    category: "정식",
    name: "된장찌개 정식",
    price: 10900,
    image: new URL("../Photo/된장찌개 정식.png", import.meta.url).href,
  },
  {
    id: "jeyuk-set",
    category: "정식",
    name: "제육볶음 정식",
    price: 12900,
    badge: "인기",
    image: new URL("../Photo/제육볶음 정식.png", import.meta.url).href,
  },
  {
    id: "bulbaek-set",
    category: "정식",
    name: "돼지불백 정식",
    price: 12900,
    image: new URL("../Photo/돼지불백 정식.png", import.meta.url).href,
  },
  {
    id: "rolled-egg",
    category: "곁들임",
    name: "계란말이",
    price: 5500,
    image: new URL("../Photo/계란말이.png", import.meta.url).href,
  },
  {
    id: "steamed-egg",
    category: "곁들임",
    name: "계란찜",
    price: 5900,
    image: new URL("../Photo/계란찜.png", import.meta.url).href,
  },
  {
    id: "soju",
    category: "음료",
    name: "소주",
    price: 4000,
    image: new URL("../Photo/소주.webp", import.meta.url).href,
  },
  {
    id: "cider",
    category: "음료",
    name: "사이다",
    price: 2000,
    image: new URL("../Photo/사이다.jpg", import.meta.url).href,
  },
  {
    id: "cola",
    category: "음료",
    name: "콜라",
    price: 2000,
    image: new URL("../Photo/콜라.jpg", import.meta.url).href,
  },
  {
    id: "fanta",
    category: "음료",
    name: "환타",
    price: 2000,
    image: new URL("../Photo/환타.png", import.meta.url).href,
  },
];
