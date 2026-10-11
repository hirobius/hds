import { cva } from 'class-variance-authority';

const widgetVariants = cva('inline-flex gap-2 [&_svg]:size-3.5');

export { widgetVariants };
