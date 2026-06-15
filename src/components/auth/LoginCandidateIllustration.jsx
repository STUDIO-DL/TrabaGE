import candidateImg from '../../assets/illustrations/login-candidate.png';

export default function LoginCandidateIllustration() {
  return (
    <div className="relative h-[17.5rem] w-full max-w-[21rem] sm:h-[19rem] sm:max-w-[23rem] lg:h-[21rem] lg:max-w-[26rem]">
      <div
        className="absolute -left-4 bottom-2 h-[14rem] w-[18rem] rounded-[55%_45%_50%_50%] bg-[#DBEAFE]/80 lg:-left-6 lg:h-[16rem] lg:w-[20rem]"
        aria-hidden
      />
      <div
        className="absolute bottom-8 right-0 h-[11rem] w-[13rem] rounded-[45%_55%_40%_60%] bg-[#EFF6FF] lg:h-[12rem] lg:w-[14rem]"
        aria-hidden
      />
      <img
        src={candidateImg}
        alt="Profesional sonriente usando un portátil"
        width={416}
        height={416}
        loading="lazy"
        decoding="async"
        className="absolute bottom-0 left-6 z-10 aspect-square w-[14.5rem] rounded-full object-cover object-center shadow-[0_20px_40px_rgba(37,99,235,0.15)] sm:w-[16rem] lg:left-8 lg:w-[18rem]"
      />
    </div>
  );
}
