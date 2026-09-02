import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from './App';
import { listDeals } from './dealStorage';
import { CALCULATOR_TYPE_KEYS } from './calculatorTypes';

// Each calculator, keyed by its stored calculatorType: the tab that opens it,
// a field to change so we can prove inputs round-trip, and the value to expect
// back after loading.
const CALCS = {
  rental: { tab: '🏠 Rental Cash Flow', field: 'Purchase Price $', changed: '345000' },
  brrrr: { tab: '🔄 BRRRR', field: 'After Repair Value $', changed: '275000' },
  househack: { tab: '🚪 House Hacking', field: 'Purchase Price $', changed: '410000' },
  flip: { tab: '🔨 Fix & Flip', field: 'Rehab Budget $', changed: '61000' },
};

beforeEach(() => { window.localStorage.clear(); });

// Save a named deal on one calculator. Leaves the app on that tab.
async function saveOn(type, name) {
  const cfg = CALCS[type];
  fireEvent.click(screen.getByText(cfg.tab));
  fireEvent.change(screen.getByLabelText(cfg.field), { target: { value: cfg.changed } });
  fireEvent.click(screen.getByText('💾 Save Deal'));
  fireEvent.change(screen.getByPlaceholderText('e.g. 412 Oak St'), { target: { value: name } });
  fireEvent.click(screen.getByText('💾 Save Deal'));
  await waitFor(() => expect(screen.getByText(/^Saved/)).toBeInTheDocument());
}

describe('every calculator can save', () => {
  test('the four type keys are exactly what the calculators write', async () => {
    render(<App />);
    for (const type of Object.keys(CALCS)) {
      await saveOn(type, 'Deal ' + type);
    }
    const stored = await listDeals();
    expect(stored).toHaveLength(4);
    expect(stored.map((d) => d.calculatorType).sort()).toEqual([...CALCULATOR_TYPE_KEYS].sort());
  });

  test.each(Object.keys(CALCS))('%s saves with its type, name, inputs and summary', async (type) => {
    render(<App />);
    await saveOn(type, 'A ' + type + ' deal');

    const stored = await listDeals();
    expect(stored).toHaveLength(1);
    const deal = stored[0];
    expect(deal.calculatorType).toBe(type);
    expect(deal.name).toBe('A ' + type + ' deal');
    expect(deal.inputs[Object.keys(deal.inputs)[0]]).toBeDefined();
    // Every calculator stores at least one finite headline figure
    const numeric = Object.values(deal.summary).filter((v) => typeof v === 'number' && isFinite(v));
    expect(numeric.length).toBeGreaterThan(0);
  });

  test.each(Object.keys(CALCS))('%s round-trips: save, edit, reload restores inputs', async (type) => {
    const cfg = CALCS[type];
    render(<App />);
    await saveOn(type, 'Round trip ' + type);

    // Change the live form so a successful load is unambiguous
    fireEvent.change(screen.getByLabelText(cfg.field), { target: { value: '999' } });

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('Round trip ' + type)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Open'));

    await waitFor(() =>
      expect(screen.getByLabelText(cfg.field)).toHaveValue(Number(cfg.changed))
    );
    // Loading makes that deal the save target
    expect(screen.getByText('💾 Update Saved Deal')).toBeInTheDocument();
  });
});

describe('opening a saved deal lands on the matching tab', () => {
  test.each(Object.keys(CALCS))('%s opens its own calculator, not another', async (type) => {
    render(<App />);
    // Save one deal on every calculator so the list is genuinely mixed
    for (const t of Object.keys(CALCS)) await saveOn(t, 'Deal ' + t);

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('Deal ' + type)).toBeInTheDocument());

    // Click Open on the row belonging to this type
    fireEvent.click(within(screen.getByTestId('deal-row-' + type)).getByText('Open'));

    // The matching calculator's distinctive field is now on screen with its value
    await waitFor(() =>
      expect(screen.getByLabelText(CALCS[type].field)).toHaveValue(Number(CALCS[type].changed))
    );
  });
});

describe('saved deals list across calculator types', () => {
  test('shows all four with a type label per row', async () => {
    render(<App />);
    for (const t of Object.keys(CALCS)) await saveOn(t, 'Deal ' + t);

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('Deal rental')).toBeInTheDocument());

    expect(screen.getByText('Deal brrrr')).toBeInTheDocument();
    expect(screen.getByText('Deal househack')).toBeInTheDocument();
    expect(screen.getByText('Deal flip')).toBeInTheDocument();
    // Type labels distinguish the rows (also present on the filter chips)
    expect(screen.getAllByText(/Rental Cash Flow/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/House Hacking/).length).toBeGreaterThan(0);
  });

  test('filtering by type narrows the list', async () => {
    render(<App />);
    for (const t of Object.keys(CALCS)) await saveOn(t, 'Deal ' + t);

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('Deal rental')).toBeInTheDocument());
    expect(screen.getByText('All (4)')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/🔨 Fix & Flip \(1\)/));
    expect(screen.getByText('Deal flip')).toBeInTheDocument();
    expect(screen.queryByText('Deal rental')).not.toBeInTheDocument();
    expect(screen.queryByText('Deal brrrr')).not.toBeInTheDocument();

    // Back to all
    fireEvent.click(screen.getByText('All (4)'));
    expect(screen.getByText('Deal rental')).toBeInTheDocument();
  });

  test('sorting by name reorders the list', async () => {
    render(<App />);
    await saveOn('rental', 'Zebra House');
    await saveOn('flip', 'Alpha House');

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('Alpha House')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Name'));
    const names = screen.getAllByText(/House$/).map((n) => n.textContent);
    expect(names).toEqual(['Alpha House', 'Zebra House']);
  });

  test.each(Object.keys(CALCS))('%s deals can be deleted from the list', async (type) => {
    render(<App />);
    await saveOn(type, 'Doomed ' + type);

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('Doomed ' + type)).toBeInTheDocument());

    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Confirm?'));

    await waitFor(() => expect(screen.getByText('No saved deals yet')).toBeInTheDocument());
    expect(await listDeals()).toHaveLength(0);
  });

  test('deleting one type leaves the others intact', async () => {
    render(<App />);
    for (const t of Object.keys(CALCS)) await saveOn(t, 'Deal ' + t);

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('Deal rental')).toBeInTheDocument());

    const row = screen.getByTestId('deal-row-brrrr');
    fireEvent.click(within(row).getByText('Delete'));
    fireEvent.click(within(row).getByText('Confirm?'));

    await waitFor(() => expect(screen.queryByText('Deal brrrr')).not.toBeInTheDocument());
    const remaining = await listDeals();
    expect(remaining).toHaveLength(3);
    expect(remaining.map((d) => d.calculatorType).sort()).toEqual(['flip', 'househack', 'rental']);
  });
});
