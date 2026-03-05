import type { Metadata } from 'next';
import { PracticeContent } from "@/components/practice/PracticeContent";

export const metadata: Metadata = {
  title: 'Pratique - Frañol',
  description: 'Choisissez votre mode de pratique pour apprendre le français et l\'espagnol',
};

export default function PracticePage() {
  return <PracticeContent />;
}
