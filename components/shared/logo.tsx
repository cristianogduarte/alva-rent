import Image from 'next/image';

export function Logo({
  size = 'md',
  variant = 'full',
}: {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark';
}) {
  const sizes = {
    sm: { px: 32, text: 'text-sm', sub: 'text-[10px]' },
    md: { px: 40, text: 'text-base', sub: 'text-[11px]' },
    lg: { px: 56, text: 'text-lg', sub: 'text-xs' },
  }[size];

  const mark = (
    <Image
      src="/brand/alva-mark.png"
      alt="ALVA"
      width={sizes.px}
      height={sizes.px}
      priority
      className="rounded-xl"
    />
  );

  if (variant === 'mark') return mark;

  return (
    <div className="flex items-center gap-2">
      {mark}
      <div>
        <div className={`font-bold text-navy-900 leading-tight ${sizes.text}`}>ALVA Rent</div>
        <div className={`uppercase tracking-wider text-ink-400 ${sizes.sub}`}>
ALVA ONE
        </div>
      </div>
    </div>
  );
}
