import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-navy-900 text-white hover:bg-navy-700',
        secondary: 'bg-gold-500 text-navy-900 hover:bg-gold-400',
        outline: 'border border-navy-100 text-navy-900 bg-white hover:bg-navy-50',
        ghost: 'text-navy-900 hover:bg-navy-50',
      },
      size: {
        sm: 'text-xs px-3 py-1.5 rounded-md',
        md: 'text-sm px-4 py-2 rounded-lg',
        lg: 'text-base px-5 py-3 rounded-xl',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

interface Props
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({ className, variant, size, ...props }: Props) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}
