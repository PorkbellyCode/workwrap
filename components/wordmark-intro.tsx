// 로그인 화면의 워드마크. 열릴 때 한 번만 "말 → 글"을 보여준다:
// 녹음 버튼과 같은 오렌지 파형이 잠깐 출렁이다 가라앉고, 그 자리에 글자가 왼쪽부터 올라온다.
// 전체 약 1.2초, 반복하지 않는다. CSS 키프레임만 쓰므로 JS 상태도 의존성도 없다.
// 움직임 줄이기 설정에서는 파형을 감추고 글자를 처음부터 보여준다.

// 막대마다 최고 높이. 매 렌더 같은 값이어야 서버·클라이언트 마크업이 일치한다.
const PEAKS = [0.35, 0.6, 0.9, 0.55, 1, 0.7, 0.45, 0.85, 0.65, 1, 0.5, 0.8, 0.4, 0.7, 0.3];
const WORK = "Work";
const WRAP = "Wrap";

// 파형이 가라앉기 시작하는 시점에 첫 글자가 올라오기 시작한다.
const LETTER_START_MS = 450;
const LETTER_STEP_MS = 45;

export default function WordmarkIntro() {
  const letters = [...WORK, ...WRAP];

  return (
    <h1 className="relative text-3xl font-medium tracking-tight">
      {/* 낭독기는 애니메이션과 상관없이 이 이름 하나만 읽는다. */}
      <span className="sr-only">WorkWrap</span>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-[3px] motion-reduce:hidden"
      >
        {PEAKS.map((peak, index) => (
          <span
            key={index}
            className="h-[1.1em] w-[3px] rounded-full bg-brand opacity-0 [animation:wordmark-bar_600ms_ease-in-out_both]"
            style={
              {
                "--peak": peak,
                animationDelay: `${index * 20}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>

      <span aria-hidden>
        {letters.map((letter, index) => (
          <span
            key={index}
            className={`inline-block [animation:wordmark-letter_450ms_cubic-bezier(0.32,0.72,0,1)_both] motion-reduce:animate-none ${
              index >= WORK.length ? "text-brand" : ""
            }`}
            style={{ animationDelay: `${LETTER_START_MS + index * LETTER_STEP_MS}ms` }}
          >
            {letter}
          </span>
        ))}
      </span>
    </h1>
  );
}
