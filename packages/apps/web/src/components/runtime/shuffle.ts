const SHUFFLE_CHARS = "01";

function shuffleWord(word: string) {
  return [...word].map(() => SHUFFLE_CHARS[Math.floor(Math.random() * SHUFFLE_CHARS.length)]).join("");
}

export function initShuffleHover() {
  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>('[shuffle="true"]').forEach((wrapper) => {
    const els = Array.from(wrapper.querySelectorAll<HTMLElement>('[shuffle="el"]'));
    const clear = (el: HTMLElement & { intervalAnimationWord?: number; timeoutAnimationWord?: number }) => {
      if (el.intervalAnimationWord) {
        window.clearInterval(el.intervalAnimationWord);
        el.intervalAnimationWord = undefined;
      }
      if (el.timeoutAnimationWord) {
        window.clearTimeout(el.timeoutAnimationWord);
        el.timeoutAnimationWord = undefined;
      }
      if (el.dataset.word) el.textContent = el.dataset.word;
    };

    const onEnter = () => {
      els.forEach((el) => {
        const mutable = el as HTMLElement & { intervalAnimationWord?: number; timeoutAnimationWord?: number };
        if (mutable.intervalAnimationWord) return;
        const word = el.textContent ?? "";
        el.dataset.word = word;
        mutable.intervalAnimationWord = window.setInterval(() => {
          el.textContent = shuffleWord(word);
        }, 60);
        mutable.timeoutAnimationWord = window.setTimeout(() => clear(mutable), 500);
      });
    };
    const onLeave = () => els.forEach((el) => clear(el as HTMLElement & { intervalAnimationWord?: number; timeoutAnimationWord?: number }));

    wrapper.addEventListener("mouseenter", onEnter);
    wrapper.addEventListener("mouseleave", onLeave);
    cleanups.push(() => {
      wrapper.removeEventListener("mouseenter", onEnter);
      wrapper.removeEventListener("mouseleave", onLeave);
      onLeave();
    });
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}
