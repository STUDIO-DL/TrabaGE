import { useCallback, useState } from 'react';
import ContactPickerModal from '../components/contact/ContactPickerModal';
import {
  CONTACT_NO_METHODS_MESSAGE,
  openContactMethod,
  openProfileContact,
  PERSONAL_CONTACT_METHODS,
} from '../utils/contact';

/**
 * Smart contact handler — direct open for a single method, picker for multiple, info toast when none.
 *
 * @param {{ showToast: (message: string, type?: string) => void, methodIds?: import('../utils/contact').ContactMethodId[], pickerTitle?: string }} options
 */
export default function useContactAction({
  showToast,
  methodIds = PERSONAL_CONTACT_METHODS,
  pickerTitle,
} = {}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMethods, setPickerMethods] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setPickerMethods([]);
    setActiveProfile(null);
  }, []);

  const handleContact = useCallback(
    async (profileOrResolver) => {
      const profile =
        typeof profileOrResolver === 'function'
          ? await profileOrResolver()
          : profileOrResolver;

      const result = openProfileContact(profile, methodIds);

      if (result.needsPicker) {
        setActiveProfile(profile);
        setPickerMethods(result.methods);
        setPickerOpen(true);
        return;
      }

      if (!result.ok) {
        showToast?.(result.error || CONTACT_NO_METHODS_MESSAGE, 'info');
        return;
      }
    },
    [methodIds, showToast],
  );

  const handlePickerSelect = useCallback(
    (methodId) => {
      if (!activeProfile) return;
      openContactMethod(methodId, activeProfile, methodIds);
    },
    [activeProfile, methodIds],
  );

  const contactPickerModal = (
    <ContactPickerModal
      isOpen={pickerOpen}
      onClose={closePicker}
      methods={pickerMethods}
      onSelect={handlePickerSelect}
      title={pickerTitle}
    />
  );

  return {
    handleContact,
    contactPickerModal,
    pickerOpen,
    closePicker,
  };
}
