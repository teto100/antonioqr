import { useEffect } from 'react';

export const useCopyProtection = () => {
  useEffect(() => {
    // Solo activar si está habilitado en las variables de entorno
    if (process.env.NEXT_PUBLIC_ENABLE_COPY_PROTECTION !== 'true') {
      return;
    }
    // Prevenir clic derecho y copia
    const preventRightClick = (e: MouseEvent) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => {

      e.clipboardData?.setData('text/plain', 'Te estoy viendo 👀');
      e.preventDefault();
    };
    
    // Monitorear clipboard cada segundo
    const clipboardMonitor = setInterval(async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clipboardText = await navigator.clipboard.readText();

          if (clipboardText && clipboardText !== 'Te estoy viendo 👀') {

            await navigator.clipboard.writeText('Te estoy viendo 👀');
          }
        }
      } catch (error) {

      }
    }, 1000);

    const preventKeys = (e: KeyboardEvent) => {
      // Windows/Linux (Ctrl) y Mac (Cmd)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'a' || e.key === 'x' || e.key === 's' || e.key === 'u')) {

        e.preventDefault();
      }
      // DevTools
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) {

        e.preventDefault();
      }
      // Mac: Cmd+Option+I para DevTools
      if (e.metaKey && e.altKey && e.key === 'i') {

        e.preventDefault();
      }
    };
    
    const preventSelection = () => {
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges();
      }
    };
    
    const preventDrag = (e: DragEvent) => e.preventDefault();

    document.addEventListener('contextmenu', preventRightClick);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('keydown', preventKeys);
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventDrag);
    document.addEventListener('mousedown', preventSelection);
    
    // CSS para prevenir selección
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    (document.body.style as any).msUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', preventRightClick);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('keydown', preventKeys);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventDrag);
      document.removeEventListener('mousedown', preventSelection);
      clearInterval(clipboardMonitor);
      
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      (document.body.style as any).msUserSelect = '';
    };
  }, []);
};