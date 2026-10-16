import type { ComponentType } from 'react';

export type DocSection = { id: string; title: string };

export type DocPage = {
  slug: string;
  label: string;
  title: string;
  description: string;
  eyebrow: string;
  sections: DocSection[];
  component: ComponentType;
};
