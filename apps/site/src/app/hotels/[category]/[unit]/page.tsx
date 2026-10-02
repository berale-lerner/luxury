import { STAYS } from "@/lib/stays";
import UnitClient from "./UnitClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return STAYS.map((unit) => ({
    category: unit.category,
    unit: unit.slug,
  }));
}

export default function UnitPage() {
  return <UnitClient />;
}
