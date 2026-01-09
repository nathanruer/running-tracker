import { useEffect, useRef } from 'react';
import { FieldErrors } from 'react-hook-form';

/**
 * Hook to automatically scroll and focus on the first form field with an error
 * Triggers on each form submission attempt that results in validation errors
 * 
 * @param errors - The errors object from react-hook-form's formState
 * @param submitCount - Number of form submission attempts (from formState.submitCount)
 */
export function useScrollToError<T extends Record<string, unknown>>(
  errors: FieldErrors<T>,
  submitCount: number
) {
  const lastSubmitCount = useRef(0);

  useEffect(() => {
    const hasErrors = Object.keys(errors).length > 0;
    const isNewSubmitAttempt = submitCount > lastSubmitCount.current;
    
    if (hasErrors && isNewSubmitAttempt) {
      lastSubmitCount.current = submitCount;
      
      requestAnimationFrame(() => {
        const errorMessages = document.querySelectorAll('[data-form-error="true"]');
        
        if (errorMessages.length > 0) {
          let firstErrorMessage: Element | null = null;
          let minTop = Infinity;
          
          errorMessages.forEach((msg) => {
            const rect = msg.getBoundingClientRect();
            if (rect.top < minTop && rect.height > 0) {
              minTop = rect.top;
              firstErrorMessage = msg;
            }
          });
          
          if (firstErrorMessage) {
            const formItem = (firstErrorMessage as HTMLElement).closest('.space-y-2');
            const targetElement = formItem || firstErrorMessage;
            
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
            
            setTimeout(() => {
              if (formItem) {
                const focusable = formItem.querySelector(
                  'input, button, select, textarea'
                ) as HTMLElement | null;
                focusable?.focus();
              }
            }, 300);
          }
        }
      });
    }
  }, [errors, submitCount]);
}
