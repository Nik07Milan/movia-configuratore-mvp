import { useDropzone, type Accept } from 'react-dropzone'
import { Upload } from 'lucide-react'

interface Props {
  label: string
  accept: Accept
  onFile: (file: File) => void
  currentFile?: File | null
  hint?: string
}

export function FileDropzone({ label, accept, onFile, currentFile, hint }: Props) {
  const extensions = Object.values(accept).flat().join(', ')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    onDropAccepted: ([file]) => onFile(file),
  })

  return (
    <div
      {...getRootProps()}
      className={[
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50',
        currentFile ? 'border-green-400 bg-green-50' : '',
      ].join(' ')}
    >
      <input {...getInputProps()} />
      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
      {currentFile
        ? <p className="text-sm font-medium text-green-700">{currentFile.name}</p>
        : <>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="text-xs text-slate-400 mt-1">{hint ?? `Formati accettati: ${extensions}`}</p>
          </>
      }
    </div>
  )
}
