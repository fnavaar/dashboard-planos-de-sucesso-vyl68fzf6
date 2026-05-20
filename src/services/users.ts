import pb from '@/lib/pocketbase/client'

export interface User {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
}

export async function getUsers() {
  return pb.collection('users').getFullList<User>({
    sort: 'name',
  })
}

export async function createUser(data: any) {
  return pb.collection('users').create({
    ...data,
    passwordConfirm: data.password,
    verified: true,
  })
}
