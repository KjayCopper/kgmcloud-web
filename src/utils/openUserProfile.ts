export function openUserProfile(id: number): void {
  const win = window.open(
    `/staff/userdetails/${id}`,
    `user-${id}`,
    'menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes,width=980,height=760'
  )
  win?.focus()
}