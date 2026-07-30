import { useState } from 'react';

/**
 * Collapsible technical error panel for authorized admins only.
 * Never mount this for end users.
 */
export default function AdminTechnicalErrorDetails({
  errorId,
  type,
  route,
  action,
  originalMessage,
  code,
  status,
  stack,
  occurredAt,
}) {
  const [open, setOpen] = useState(false);

  if (!errorId && !originalMessage && !stack) return null;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 text-left text-xs text-slate-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 font-medium text-slate-800"
      >
        <span>Ver detalles técnicos</span>
        <span aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <dl className="space-y-1 border-t border-slate-200 px-3 py-2 font-mono">
          {errorId ? (
            <div>
              <dt className="inline text-slate-500">ID: </dt>
              <dd className="inline">{errorId}</dd>
            </div>
          ) : null}
          {occurredAt ? (
            <div>
              <dt className="inline text-slate-500">Fecha: </dt>
              <dd className="inline">{occurredAt}</dd>
            </div>
          ) : null}
          {type ? (
            <div>
              <dt className="inline text-slate-500">Tipo: </dt>
              <dd className="inline">{type}</dd>
            </div>
          ) : null}
          {action ? (
            <div>
              <dt className="inline text-slate-500">Acción: </dt>
              <dd className="inline">{action}</dd>
            </div>
          ) : null}
          {route ? (
            <div>
              <dt className="inline text-slate-500">Ruta: </dt>
              <dd className="inline">{route}</dd>
            </div>
          ) : null}
          {code ? (
            <div>
              <dt className="inline text-slate-500">Código: </dt>
              <dd className="inline">{code}</dd>
            </div>
          ) : null}
          {status ? (
            <div>
              <dt className="inline text-slate-500">Estado: </dt>
              <dd className="inline">{status}</dd>
            </div>
          ) : null}
          {originalMessage ? (
            <div>
              <dt className="block text-slate-500">Error original</dt>
              <dd className="mt-0.5 break-all whitespace-pre-wrap">{originalMessage}</dd>
            </div>
          ) : null}
          {stack ? (
            <div>
              <dt className="block text-slate-500">Stack</dt>
              <dd className="mt-0.5 max-h-40 overflow-auto whitespace-pre-wrap break-all">{stack}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
