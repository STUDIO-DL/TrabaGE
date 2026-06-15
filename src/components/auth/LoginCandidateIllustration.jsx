import candidateImg from '../../assets/illustrations/login-candidate.png';

export default function LoginCandidateIllustration({ className = '' }) {
  return (
    <figure
      className={[
        'relative w-full max-w-[15rem] sm:max-w-[17rem] md:max-w-[19rem] lg:max-w-[22rem] xl:max-w-[26rem]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="absolute -bottom-2 left-1/2 h-[88%] w-[92%] -translate-x-1/2 rounded-[55%_45%_50%_50%] bg-[#DBEAFE]/75 md:-bottom-3"
        aria-hidden
      />
      <div
        className="absolute right-0 top-6 h-24 w-28 rounded-[45%_55%_40%_60%] bg-[#EFF6FF] md:top-8 md:h-28 md:w-32 lg:h-32 lg:w-36"
        aria-hidden
      />
      <img
        src={candidateImg}
        alt="Profesional sonriente usando un portátil"
        width={416}
        height={416}
        fetchPriority="high"
        decoding="async"
        className="relative z-10 mx-auto block aspect-square w-full rounded-full object-contain shadow-[0_16px_40px_rgba(37,99,235,0.18)]"
      />
    </figure>
  );
}
