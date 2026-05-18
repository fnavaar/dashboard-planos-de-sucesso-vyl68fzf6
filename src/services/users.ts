import pb from '@/lib/pocketbase/client'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export async function getUsers() {
  return pb.collection('users').getFullList<User>({
    sort: 'name',
  })
}
