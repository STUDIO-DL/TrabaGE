import { sectionTitleClass } from './companyProfileStyles';

export default function SectionTitle({ children }) {
  return (
    <h3 className={sectionTitleClass}>
      <span className="h-5 w-1 rounded-full bg-primary-600" aria-hidden />
      {children}
    </h3>
  );
}
