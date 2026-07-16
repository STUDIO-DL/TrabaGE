import { sectionTitleClass } from './companyProfileStyles';

export default function SectionTitle({ children }) {
  return <h3 className={sectionTitleClass}>{children}</h3>;
}
