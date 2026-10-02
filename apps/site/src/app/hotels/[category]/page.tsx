import CategoryClient from "./CategoryClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ category: "suites" }, { category: "apartments" }];
}

export default function CategoryPage() {
  return <CategoryClient />;
}
