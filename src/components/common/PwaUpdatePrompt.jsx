import { usePwaUpdate } from '../../hooks/usePwaUpdate';

/** Headless registrar: autoUpdate reloads the page when a new SW is ready. */
export default function PwaUpdatePrompt() {
  usePwaUpdate();
  return null;
}
