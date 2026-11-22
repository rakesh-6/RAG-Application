import { formatBytes, formatDate } from '../../utils/format'
import Icon from '../ui/Icon'
import StatusBadge from './StatusBadge'

const COLUMNS = ['Type', 'Size', 'Pages', 'Chunks', 'Uploaded', 'Status']

function SkeletonRows() {
  return [0, 1, 2].map((row) => (
    <tr key={row} className="border-t border-slate-200" aria-hidden="true">
      <td className="px-5 py-4">
        <div className="h-3.5 w-48 rounded-md bg-slate-200 motion-safe:animate-pulse" />
      </td>
      {COLUMNS.map((column) => (
        <td key={column} className="px-3 py-4">
          <div className="h-3.5 w-12 rounded-md bg-slate-200 motion-safe:animate-pulse" />
        </td>
      ))}
      <td />
    </tr>
  ))
}

export default function DocumentTable({ documents, loading, onDelete }) {
  return (
    <section aria-label="Your documents" aria-busy={loading} className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-600">
              <th scope="col" className="px-5 py-3 font-medium">
                Name
              </th>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="px-3 py-3 font-medium">
                  {column}
                </th>
              ))}
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonRows />}
            {!loading && documents.length === 0 && (
              <tr className="border-t border-slate-200">
                <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                  No documents yet. Upload one above to start asking questions.
                </td>
              </tr>
            )}
            {!loading &&
              documents.map((doc) => (
                <tr key={doc.id} className="border-t border-slate-200">
                  <td className="max-w-[320px] px-5 py-2.5">
                    <div className="truncate font-medium" title={doc.original_filename}>
                      {doc.original_filename}
                    </div>
                    {doc.status === 'failed' && doc.error_message && (
                      <div className="mt-0.5 text-[13px] whitespace-normal text-red-700">{doc.error_message}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 uppercase">{doc.file_type}</td>
                  <td className="px-3 py-2.5 text-slate-600">{formatBytes(doc.size_bytes)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{doc.page_count ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{doc.status === 'ready' ? doc.chunk_count : '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatDate(doc.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-3 py-1 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(doc)}
                      disabled={doc.status === 'processing'}
                      aria-label={`Delete ${doc.original_filename}`}
                      className="inline-flex size-11 items-center justify-center rounded-[10px] text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      <Icon name="trash" className="size-[18px]" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
