import React, { useEffect, useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

const STORAGE_KEY = 'naan_todos_v1'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function useLocalStorageState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initial
    } catch (e) {
      console.error('localStorage read error', e)
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch (e) {
      console.error('localStorage write error', e)
    }
  }, [key, state])
  return [state, setState]
}

function TodoForm({ onAdd }) {
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [due, setDue] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    const item = {
      id: uid(),
      text: text.trim(),
      completed: false,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      due: due || null,
      createdAt: Date.now(),
    }
    onAdd(item)
    setText('')
    setTags('')
    setDue('')
  }

  return (
    <form className="todo-form" onSubmit={submit}>
      <input aria-label="New todo" value={text} onChange={e => setText(e.target.value)} placeholder="What needs doing?" />
      <input aria-label="Tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="tags (comma separated)" />
      <input aria-label="Due date" type="date" value={due} onChange={e => setDue(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  )
}

function Filters({ filter, setFilter, search, setSearch, tagList, selectedTag, setSelectedTag, sort, setSort }) {
  return (
    <div className="filters">
      <div className="left">
        <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter by status">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={selectedTag || ''} onChange={e => setSelectedTag(e.target.value || null)} aria-label="Filter by tag">
          <option value="">All tags</option>
          {tagList.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="right">
        <input aria-label="Search" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort">
          <option value="created">Recently added</option>
          <option value="due">Due date</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>
    </div>
  )
}

function TodoItem({ todo, index, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(todo.text)

  useEffect(() => setText(todo.text), [todo.text])

  function save() {
    onEdit({ ...todo, text: text.trim() })
    setEditing(false)
  }

  return (
    <Draggable draggableId={todo.id} index={index}>
      {(provided) => (
        <div className={`todo-item ${todo.completed ? 'done' : ''}`} ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <label>
            <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)} />
          </label>
          <div className="main">
            {editing ? (
              <>
                <input value={text} onChange={e => setText(e.target.value)} />
                <button onClick={save}>Save</button>
                <button onClick={() => setEditing(false)}>Cancel</button>
              </>
            ) : (
              <>
                <div className="text">{todo.text}</div>
                <div className="meta">
                  {todo.tags && todo.tags.map(t => <span className="tag" key={t}>#{t}</span>)}
                  {todo.due && <span className="due">Due: {todo.due}</span>}
                </div>
              </>
            )}
          </div>
          <div className="actions">
            <button onClick={() => setEditing(s => !s)} aria-label="Edit">✏️</button>
            <button onClick={() => onDelete(todo.id)} aria-label="Delete">🗑️</button>
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default function App() {
  const [todos, setTodos] = useLocalStorageState(STORAGE_KEY, [])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState(null)
  const [sort, setSort] = useState('created')

  useEffect(() => {
    // migrate old shape if needed
  }, [])

  const tagList = useMemo(() => {
    const s = new Set()
    todos.forEach(t => t.tags && t.tags.forEach(tag => s.add(tag)))
    return Array.from(s)
  }, [todos])

  function addTodo(item) {
    setTodos(prev => [item, ...prev])
  }

  function toggle(id) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  function del(id) {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  function edit(item) {
    setTodos(prev => prev.map(t => t.id === item.id ? item : t))
  }

  function onDragEnd(result) {
    if (!result.destination) return
    const newList = Array.from(todos)
    const [moved] = newList.splice(result.source.index, 1)
    newList.splice(result.destination.index, 0, moved)
    setTodos(newList)
  }

  const filtered = useMemo(() => {
    const now = new Date().toISOString().slice(0,10)
    let list = todos.slice()
    if (filter === 'active') list = list.filter(t => !t.completed)
    if (filter === 'completed') list = list.filter(t => t.completed)
    if (filter === 'overdue') list = list.filter(t => t.due && t.due < now && !t.completed)
    if (selectedTag) list = list.filter(t => t.tags && t.tags.includes(selectedTag))
    if (search) list = list.filter(t => t.text.toLowerCase().includes(search.toLowerCase()))
    if (sort === 'due') list.sort((a,b) => (a.due||'9999') > (b.due||'9999') ? 1 : -1)
    if (sort === 'alpha') list.sort((a,b) => a.text.localeCompare(b.text))
    if (sort === 'created') list.sort((a,b) => b.createdAt - a.createdAt)
    return list
  }, [todos, filter, search, selectedTag, sort])

  return (
    <div className="app">
      <header className="header">
       <center> <h1> Todo App </h1></center>
        
      </header>

      <main className="container">
        <TodoForm onAdd={addTodo} />
        <Filters filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} tagList={tagList} selectedTag={selectedTag} setSelectedTag={setSelectedTag} sort={sort} setSort={setSort} />

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="list">
            {(provided) => (
              <div className="list" ref={provided.innerRef} {...provided.droppableProps}>
                {filtered.map((t, i) => (
                  <TodoItem key={t.id} todo={t} index={i} onToggle={toggle} onDelete={del} onEdit={edit} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </main>

     
    </div>
  )
}
