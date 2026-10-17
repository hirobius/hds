/**
 * PresenceList — a list whose items animate in and out as they come and go.
 * @category Motion
 * @tier primitive
 *
 * An item added after the list first renders rises in under a brief accent
 * wash (.hds-motion-item-enter, component-motion.css). A removed item fades
 * and collapses its height before it unmounts, so the items below close the
 * gap instead of jumping. Items present on the first render do not animate.
 * Space items with their own margin, not a parent `gap`: a gap cannot collapse,
 * so it would close in one step when the item unmounts.
 * Everything runs on motion tokens and lands at once under reduced motion.
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useHdsMotion } from '../hooks/useHdsMotion';

const ListMounted = /* @__PURE__ */ React.createContext<React.RefObject<boolean> | null>(null);

/** @public */
export interface PresenceListProps extends React.HTMLAttributes<HTMLElement> {
  /** Element rendered as the list. Defaults to 'div'; use 'ul' or 'ol' with `PresenceItem as="li"`. */
  as?: 'div' | 'ul' | 'ol';
  /** PresenceItem children, each with a stable `key`. */
  children?: React.ReactNode;
}

/**
 * The list. Children must be PresenceItems with stable keys. Tagged here, not
 * in the file block, so PresenceItem does not inherit the list's contract.
 * @usage Show where a list changed when an item is added, duplicated or removed, such as a new card dropping into a board column.
 * @whenNot A list that never changes after it renders, or content revealed on scroll.
 * @useInstead Reveal content that fades in as it scrolls into view
 */
export const PresenceList = /* @__PURE__ */ React.forwardRef<HTMLElement, PresenceListProps>(
  function PresenceList({ as = 'div', children, ...props }, ref) {
    const Tag = as as React.ElementType;
    const mounted = React.useRef(false);
    React.useEffect(() => {
      mounted.current = true;
    }, []);
    return (
      <Tag ref={ref} {...props}>
        <ListMounted.Provider value={mounted}>
          <AnimatePresence initial={false}>{children}</AnimatePresence>
        </ListMounted.Provider>
      </Tag>
    );
  },
);

/** @public */
export interface PresenceItemProps extends React.HTMLAttributes<HTMLElement> {
  /** Element rendered as the item. Defaults to 'div'. */
  as?: 'div' | 'li';
}

/** One item. Give it a stable `key` so the list can tell an add from a re-render. */
export const PresenceItem = /* @__PURE__ */ React.forwardRef<HTMLElement, PresenceItemProps>(
  function PresenceItem({ as = 'div', className, ...props }, ref) {
    const listMounted = React.useContext(ListMounted);
    // Decided once, at mount: only an item that arrives after the list rendered animates in.
    const [isNew] = React.useState(() => listMounted?.current === true);
    const exitMotion = useHdsMotion('exit');
    const MotionTag: React.ElementType = as === 'li' ? motion.li : motion.div;
    return (
      <MotionTag
        ref={ref}
        className={cn(isNew && 'hds-motion-item-enter', className)}
        exit={{
          opacity: 0,
          height: 0,
          marginTop: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0,
          overflow: 'hidden',
        }}
        transition={{ duration: exitMotion.duration, ease: exitMotion.easing }}
        {...props}
      />
    );
  },
);
