import { useQuery } from '@tanstack/react-query'
import { FileText, Calendar, Paperclip, Download } from 'lucide-react'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import { formatDate } from '../../utils/format'

export default function StudentHomework() {
  const { data } = useQuery({
    queryKey: ['homeworks'],
    queryFn: () => api.get('/homework/').then(r => r.data),
  })
  const rows = data?.results || []

  return (
    <div>
      <PageHeader title="Uyga vazifalarim" subtitle="O'qituvchilar bergan vazifalar ro'yxati" />

      <div className="space-y-4">
        {rows.length === 0 && (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-ink-300 mb-3" />
            <div className="text-ink-500">Vazifalar yo'q</div>
          </div>
        )}
        {rows.map(hw => <HomeworkCard key={hw.id} hw={hw} />)}
      </div>
    </div>
  )
}

function HomeworkCard({ hw }) {
  const dueDate = new Date(hw.due_date)
  const isOverdue = dueDate < new Date() && dueDate.toDateString() !== new Date().toDateString()

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-brand-100 text-brand-600">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-brand-600 font-semibold">{hw.group_name}</div>
            <h3 className="font-display font-bold text-lg">{hw.title}</h3>
            <div className="flex items-center gap-1 text-xs text-ink-500 mt-1">
              <Calendar className="w-3.5 h-3.5" /> Muddat: {formatDate(hw.due_date)}
            </div>
          </div>
        </div>
        {isOverdue
          ? <span className="badge-danger">Muddati o'tdi</span>
          : <span className="badge-info">Joriy</span>}
      </div>

      {hw.description && (
        <div className="mt-3 text-sm text-ink-700 bg-ink-50 rounded-xl p-3 whitespace-pre-wrap">{hw.description}</div>
      )}

      {hw.attachment && (
        <a href={hw.attachment} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800 font-medium">
          <Paperclip className="w-4 h-4" />
          <span>Biriktirilgan fayl</span>
          <Download className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  )
}
