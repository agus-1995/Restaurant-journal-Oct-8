import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ChoiceGroup } from './ChoiceGroup'
import { TagInput } from './TagInput'

function TagHarness({ initial = [] as string[], max }: { initial?: string[]; max?: number }) {
  const [values, setValues] = useState(initial)
  return (
    <>
      <TagInput
        label="Platos"
        values={values}
        onChange={setValues}
        placeholder="Ej"
        hint="Escribí uno"
        addLabel="Agregar plato"
        removeLabel={(tag) => `Quitar ${tag}`}
        max={max}
      />
      <output data-testid="values">{JSON.stringify(values)}</output>
    </>
  )
}
const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '[]') as string[]

describe('TagInput', () => {
  it('adds a tag with Enter, and clears the field', async () => {
    const user = userEvent.setup()
    render(<TagHarness />)
    await user.type(screen.getByLabelText('Platos'), 'Flan{Enter}')
    expect(values()).toEqual(['Flan'])
    expect(screen.getByLabelText('Platos')).toHaveValue('')
  })

  it('adds with a comma, with the Add button, and when the field loses focus', async () => {
    const user = userEvent.setup()
    render(<TagHarness />)
    const input = screen.getByLabelText('Platos')
    await user.type(input, 'Uno,')
    await user.type(input, 'Dos')
    await user.click(screen.getByRole('button', { name: 'Agregar plato' }))
    await user.type(input, 'Tres')
    await user.tab()
    expect(values()).toEqual(['Uno', 'Dos', 'Tres'])
  })

  it('ignores blanks and duplicates (case/accent-insensitive)', async () => {
    const user = userEvent.setup()
    render(<TagHarness initial={['Café']} />)
    const input = screen.getByLabelText('Platos')
    await user.type(input, '   {Enter}')
    await user.type(input, 'cafe{Enter}')
    expect(values()).toEqual(['Café'])
  })

  it('removes a tag', async () => {
    const user = userEvent.setup()
    render(<TagHarness initial={['A', 'B']} />)
    await user.click(screen.getByRole('button', { name: 'Quitar A' }))
    expect(values()).toEqual(['B'])
  })

  it('stops at the maximum', async () => {
    const user = userEvent.setup()
    render(<TagHarness initial={['A', 'B']} max={2} />)
    expect(screen.getByRole('button', { name: 'Agregar plato' })).toBeDisabled()
    await user.type(screen.getByLabelText('Platos'), 'C{Enter}')
    expect(values()).toEqual(['A', 'B'])
  })
})

describe('ChoiceGroup', () => {
  const options = [
    { value: 1, label: '$' },
    { value: 2, label: '$$' },
  ] as const

  function Harness({ allowDeselect }: { allowDeselect: boolean }) {
    const [value, setValue] = useState<1 | 2 | undefined>(undefined)
    return (
      <ChoiceGroup
        legend="Precio"
        options={options}
        value={value}
        onChange={setValue}
        allowDeselect={allowDeselect}
      />
    )
  }

  it('is a labelled group of toggle buttons reflecting the selection', async () => {
    const user = userEvent.setup()
    render(<Harness allowDeselect={false} />)
    expect(screen.getByRole('group', { name: 'Precio' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '$$' }))
    expect(screen.getByRole('button', { name: '$$' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '$' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('tapping the selected option again clears it only when deselecting is allowed', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness allowDeselect={false} />)
    await user.click(screen.getByRole('button', { name: '$' }))
    await user.click(screen.getByRole('button', { name: '$' }))
    expect(screen.getByRole('button', { name: '$' })).toHaveAttribute('aria-pressed', 'true')
    unmount()

    render(<Harness allowDeselect />)
    await user.click(screen.getByRole('button', { name: '$' }))
    await user.click(screen.getByRole('button', { name: '$' }))
    expect(screen.getByRole('button', { name: '$' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('announces an error message', () => {
    render(
      <ChoiceGroup
        legend="Precio"
        options={options}
        value={undefined}
        onChange={() => undefined}
        error="Falta"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Falta')
    expect(screen.getByRole('group', { name: 'Precio' })).toHaveAccessibleDescription('Falta')
  })
})
