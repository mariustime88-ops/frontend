export interface MenuItem {
  header?: string;
  label: string;
  base?: string;
  icon?: string;
  link?: string;
  children?: MenuItem[];
  guarded?: boolean;
  access?: string;
  badge?: number;
}
