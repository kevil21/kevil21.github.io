import { reducedMotion } from '@/lib/stores/motion';

/**
 * Scroll storytelling for project pages: as approach steps scroll into view, the matching
 * architecture stage lights up. Uses GSAP ScrollTrigger on desktop pointers; IntersectionObserver
 * elsewhere and under reduced motion (all stages remain visible — no meaning lives only in motion).
 */
export async function initStory(root: HTMLElement) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-arch-node]'));
  const steps = Array.from(document.querySelectorAll<HTMLElement>('[data-story-step]'));
  if (!nodes.length) return;
  const activate = (i: number) => {
    nodes.forEach((n, k) => n.classList.toggle('is-active', k <= i));
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    const el = nodes[Math.min(i, nodes.length - 1)];
    if (el && el.parentElement)
      el.parentElement.scrollTo({
        left: Math.max(0, el.offsetLeft - 32),
        behavior: reducedMotion.get() ? 'auto' : 'smooth',
      });
  };
  if (!steps.length) {
    // no steps: animate stages in sequence once when visible
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      nodes.forEach((n, i) =>
        setTimeout(() => n.classList.add('is-active'), reducedMotion.get() ? 0 : i * 140),
      );
    });
    io.observe(root);
    return;
  }
  const useGsap = matchMedia('(pointer: fine)').matches && !reducedMotion.get();
  if (useGsap) {
    try {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      steps.forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 60%',
          end: 'bottom 40%',
          onEnter: () => activate(i),
          onEnterBack: () => activate(i),
        });
        gsap.from(step, {
          opacity: 0,
          y: 12,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: { trigger: step, start: 'top 85%' },
        });
      });
      return;
    } catch {
      /* fall through to IO */
    }
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) activate(Number((e.target as HTMLElement).dataset.storyStep));
    },
    { rootMargin: '-40% 0px -40% 0px' },
  );
  steps.forEach((s) => io.observe(s));
}
