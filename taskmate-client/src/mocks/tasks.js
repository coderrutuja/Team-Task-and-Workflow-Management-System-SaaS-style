export const seed = {
  columns: [
    { id: 'todo', name: 'To do' },
    { id: 'doing', name: 'Doing' },
    { id: 'done', name: 'Done' }
  ],
  tasks: [
    { id: 't1', title: 'Q3 Evaluation', status: 'todo', labels: ['urgent','internal'], due: '2025-01-11', members: ['a','b'] },
    { id: 't2', title: 'Monthly report', status: 'todo', labels: ['review'], due: '2025-01-14', members: ['a'] },
    { id: 't3', title: 'Digital Marketing', status: 'done', labels: ['marketing'], due: '2025-01-10', members: ['c'] }
  ]
}