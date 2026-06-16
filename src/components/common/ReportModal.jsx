import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { REPORT_REASONS, reportReasonRequiresDetails } from '../../constants/reportReasons';
import { reportsService } from '../../services/reports.service';
import { useNotificationContext } from '../../context/NotificationContext';

export default function ReportModal({ isOpen, onClose, targetType, targetId }) {
  const { showToast } = useNotificationContext();
  const [reasonCode, setReasonCode] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setReasonCode('');
    setReasonDetails('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!reasonCode) {
      setError('Selecciona un motivo de reporte.');
      return;
    }

    if (reportReasonRequiresDetails(reasonCode) && !reasonDetails.trim()) {
      setError('Describe el motivo cuando seleccionas "Otro".');
      return;
    }

    setSubmitting(true);
    const { error: submitError } = await reportsService.submit({
      targetType,
      targetId,
      reasonCode,
      reasonDetails,
    });
    setSubmitting(false);

    if (submitError) {
      setError('No se pudo enviar el reporte. Inténtalo de nuevo.');
      showToast('No se pudo enviar el reporte. Inténtalo de nuevo.', 'error');
      return;
    }

    showToast('Reporte enviado. Gracias por ayudarnos a mantener la comunidad segura.', 'success');
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reportar contenido">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Cuéntanos qué ocurre. Revisaremos tu reporte lo antes posible.
        </p>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-gray-900">Motivo del reporte</legend>
          {REPORT_REASONS.map((reason) => (
            <label
              key={reason.code}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                reasonCode === reason.code
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={reason.code}
                checked={reasonCode === reason.code}
                onChange={() => setReasonCode(reason.code)}
                className="mt-0.5 text-primary-600"
              />
              <span className="text-sm text-gray-800">{reason.label}</span>
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="report-details" className="mb-1.5 block text-sm font-medium text-gray-900">
            Detalles adicionales{' '}
            <span className="font-normal text-gray-500">
              {reportReasonRequiresDetails(reasonCode) ? '(obligatorio)' : '(opcional)'}
            </span>
          </label>
          <textarea
            id="report-details"
            rows={4}
            value={reasonDetails}
            onChange={(e) => setReasonDetails(e.target.value)}
            placeholder="Describe lo ocurrido con el mayor detalle posible..."
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" fullWidth loading={submitting}>
            Enviar reporte
          </Button>
        </div>
      </form>
    </Modal>
  );
}
