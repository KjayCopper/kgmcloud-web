export interface UploadedFile {
  url: string
  name: string
  size: number
}

export async function uploadFile(file: File, token: string | null, kind: 'media' | 'files' | 'docs', apiPath = '/api/staff/upload'): Promise<UploadedFile> {
  const res = await fetch(`${apiPath}?kind=${kind}&filename=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: file,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  const data = (await res.json()) as { url?: string; name?: string; size?: number }
  return { url: data.url || '', name: data.name || file.name, size: data.size ?? file.size }
}

export async function uploadImageFile(file: File, token: string | null, apiPath = '/api/staff/upload'): Promise<string> {
  const up = await uploadFile(file, token, 'media', apiPath)
  return up.url
}

export function pickImageAndInsert(
  quill: { getSelection: (focus: boolean) => { index: number } | null; insertEmbed: (index: number, type: string, value: string) => void; setSelection: (index: number, length: number) => void; getLength: () => number },
  token: string | null,
  onError: (message: string) => void,
  apiPath = '/api/staff/upload'
): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    onError('')
    try {
      const url = await uploadImageFile(file, token, apiPath)
      const index = quill.getSelection(true)?.index ?? quill.getLength()
      quill.insertEmbed(index, 'image', url)
      quill.setSelection(index + 1, 0)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Image upload failed')
    }
  }
  input.click()
}