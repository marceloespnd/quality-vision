"use client";
import { cloneElement, isValidElement, useEffect, useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactElement, type ReactNode, type TableHTMLAttributes } from "react";

// Headless primitives: application adapters own appearance, translation and business rules.
export function Button({ type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} {...props} />;
}
export function Field({ label, help, error, children, className, labelClassName, messageClassName }: {
  label: ReactNode; help?: ReactNode; error?: ReactNode; children: ReactNode;
  className?: string; labelClassName?: string; messageClassName?: string;
}) {
  const generatedId = useId();
  const control = isValidElement(children) ? children as ReactElement<HTMLAttributes<HTMLElement>> : null;
  const id = control?.props.id ?? generatedId;
  const descriptionId = `${generatedId}-description`;
  return <div className={className}>
    <label htmlFor={id} className={labelClassName}>{label}</label>
    {control ? cloneElement(control, {
      id, "aria-invalid": error ? true : control.props["aria-invalid"],
      "aria-describedby": [control.props["aria-describedby"], (help || error) ? descriptionId : undefined].filter(Boolean).join(" ") || undefined,
    }) : children}
    {(help || error) && <small id={descriptionId} role={error ? "alert" : undefined} className={messageClassName}>{error || help}</small>}
  </div>;
}
export function Table(props: TableHTMLAttributes<HTMLTableElement>) { return <table {...props} />; }
export function LoadingState(props: HTMLAttributes<HTMLParagraphElement>) { return <p role="status" aria-live="polite" {...props} />; }
export function useModalLifecycle(initialFocus?: string) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    if (initialFocus) element?.querySelector<HTMLElement>(initialFocus)?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close(); document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [initialFocus]);
  return ref;
}
