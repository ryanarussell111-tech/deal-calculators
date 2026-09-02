import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

test('renders the app header', () => {
  render(<App />);
  expect(screen.getByText('Deal Analyzer')).toBeInTheDocument();
});

test('rental calculator is the default view and computes outputs', () => {
  render(<App />);
  expect(screen.getByText('Monthly Cash Flow')).toBeInTheDocument();
  expect(screen.getByText('Cap Rate')).toBeInTheDocument();
  expect(screen.getByText('Cash-on-Cash')).toBeInTheDocument();
  // Defaults: $200k price, 20% down + 3% closing + $0 rehab = $46,000 to close
  expect(screen.getByText('$46,000')).toBeInTheDocument();
});

test('BRRRR tab shows the calculator with computed outputs', () => {
  render(<App />);
  fireEvent.click(screen.getByText('🔄 BRRRR'));
  expect(screen.getByText('Cash Left In Deal')).toBeInTheDocument();
  expect(screen.getByText('Monthly Cash Flow (post-refi)')).toBeInTheDocument();
  expect(screen.getByText('Cash Recovered')).toBeInTheDocument();
  expect(screen.getByText('Equity After Refi')).toBeInTheDocument();
  // Defaults: $65,400 invested pre-refi, $49,500 cash out -> $15,900 left in
  expect(screen.getAllByText('$15,900').length).toBeGreaterThan(0);
});

test('house hacking tab shows the calculator with computed outputs', () => {
  render(<App />);
  fireEvent.click(screen.getByText('🚪 House Hacking'));
  expect(screen.getByText('Your Effective Monthly Housing Cost')).toBeInTheDocument();
  expect(screen.getByText('Monthly Savings vs Renting')).toBeInTheDocument();
  expect(screen.getByText('Rent Roll')).toBeInTheDocument();
  // Defaults are the duplex example: $1,129.39 effective cost, $370.61 saved
  expect(screen.getAllByText('$1,129.39').length).toBeGreaterThan(0);
  expect(screen.getByText('$370.61')).toBeInTheDocument();
  // $300k x 5% down + 3% closing
  expect(screen.getByText('$24,000')).toBeInTheDocument();
});

test('house hacking unit count adds rent rows', () => {
  render(<App />);
  fireEvent.click(screen.getByText('🚪 House Hacking'));
  // "Unit N" appears in both the unit picker and the rent roll, so count rather
  // than expecting a single match.
  expect(screen.queryAllByText('Unit 1').length).toBeGreaterThan(0);
  expect(screen.queryAllByText('Unit 2').length).toBeGreaterThan(0);
  expect(screen.queryAllByText('Unit 3')).toHaveLength(0);

  // Switch to a fourplex via the unit-count control
  fireEvent.click(screen.getByRole('button', { name: '4' }));
  expect(screen.queryAllByText('Unit 3').length).toBeGreaterThan(0);
  expect(screen.queryAllByText('Unit 4').length).toBeGreaterThan(0);
});

test('fix & flip tab shows the calculator with computed outputs', () => {
  render(<App />);
  fireEvent.click(screen.getByText('🔨 Fix & Flip'));
  expect(screen.getByText('Net Profit')).toBeInTheDocument();
  expect(screen.getByText('Return on Invested Cash')).toBeInTheDocument();
  expect(screen.getByText('Breakeven Sale Price')).toBeInTheDocument();
  // Defaults are the hand-verified flip: $31,500 profit on $80,400 cash
  expect(screen.getAllByText('$31,500.00').length).toBeGreaterThan(0);
  expect(screen.getByText('39.18%')).toBeInTheDocument();
  expect(screen.getAllByText('$80,400').length).toBeGreaterThan(0);
});

test('fix & flip flags the 70% rule and reacts to price changes', () => {
  render(<App />);
  fireEvent.click(screen.getByText('🔨 Fix & Flip'));
  // Default $150k purchase exceeds the $137k max offer
  expect(screen.getByText('70% RULE — FAIL')).toBeInTheDocument();

  // Drop the purchase price below the threshold and the badge flips
  const priceInput = screen.getByDisplayValue('150000');
  fireEvent.change(priceInput, { target: { value: '130000' } });
  expect(screen.getByText('70% RULE — PASS')).toBeInTheDocument();
});

test('fix & flip hides points for conventional financing', () => {
  render(<App />);
  fireEvent.click(screen.getByText('🔨 Fix & Flip'));
  expect(screen.getByText('Points % of Loan')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Conventional' }));
  expect(screen.queryByText('Points % of Loan')).not.toBeInTheDocument();
});

describe('points and saved deals', () => {
  beforeEach(() => { window.localStorage.clear(); });

  test('points field raises cash to close without changing cash flow', async () => {
    render(<App />);
    // Defaults: $200k, 20% down -> $160k loan, $46,000 cash to close, $94.02/mo
    expect(screen.getByText('$46,000')).toBeInTheDocument();
    // Appears twice: the headline card and the breakdown's cash-flow row
    expect(screen.getAllByText('$94.02').length).toBeGreaterThan(0);

    // 1 point on a $160k loan = $1,600 more cash to close
    fireEvent.change(screen.getByLabelText('Points Charged %'), { target: { value: '1' } });

    expect(screen.getByText('$47,600')).toBeInTheDocument();
    expect(screen.getAllByText('$94.02').length).toBeGreaterThan(0); // monthly unchanged
    expect(screen.getByText(/Points \(1% of loan\)/)).toBeInTheDocument();
  });

  test('saving requires a name, then the deal appears in Saved Deals', async () => {
    render(<App />);
    // First click with no name prompts for one instead of saving
    fireEvent.click(screen.getByText('💾 Save Deal'));
    expect(screen.getByText(/Give this deal a name first/)).toBeInTheDocument();

    const nameField = screen.getByPlaceholderText('e.g. 412 Oak St');
    fireEvent.change(nameField, { target: { value: '412 Oak St' } });
    fireEvent.click(screen.getByText('💾 Save Deal'));
    await waitFor(() => expect(screen.getByText(/Saved/)).toBeInTheDocument());

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('412 Oak St')).toBeInTheDocument());
    // Quick-glance columns come from the stored summary
    expect(screen.getByText('$94.02')).toBeInTheDocument();
    expect(screen.getByText('6.63%')).toBeInTheDocument();
    expect(screen.getByText('Rental Cash Flow')).toBeInTheDocument();
  });

  test('opening a saved deal loads its inputs back into the calculator', async () => {
    render(<App />);
    // Save a deal with a distinctive purchase price
    fireEvent.change(screen.getByLabelText('Purchase Price $'), { target: { value: '345000' } });
    fireEvent.click(screen.getByText('💾 Save Deal'));
    fireEvent.change(screen.getByPlaceholderText('e.g. 412 Oak St'), { target: { value: 'Distinctive' } });
    fireEvent.click(screen.getByText('💾 Save Deal'));
    await waitFor(() => expect(screen.getByText(/Saved/)).toBeInTheDocument());

    // Change the form afterwards so we can prove the load actually restores
    fireEvent.change(screen.getByLabelText('Purchase Price $'), { target: { value: '111111' } });

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('Distinctive')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Open'));

    await waitFor(() => expect(screen.getByLabelText('Purchase Price $')).toHaveValue(345000));
    // The loaded deal is now the save target, so the button offers an update
    expect(screen.getByText('💾 Update Saved Deal')).toBeInTheDocument();
  });

  test('deleting a saved deal takes two clicks and removes it', async () => {
    render(<App />);
    // The name field only appears after the first save attempt
    fireEvent.click(screen.getByText('💾 Save Deal'));
    fireEvent.change(screen.getByPlaceholderText('e.g. 412 Oak St'), { target: { value: 'To Delete' } });
    fireEvent.click(screen.getByText('💾 Save Deal'));
    await waitFor(() => expect(screen.getByText(/Saved/)).toBeInTheDocument());

    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('To Delete')).toBeInTheDocument());

    // First click arms the confirm, second click deletes
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByText('Confirm?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm?'));

    await waitFor(() => expect(screen.getByText('No saved deals yet')).toBeInTheDocument());
    expect(screen.queryByText('To Delete')).not.toBeInTheDocument();
  });

  test('saved deals tab shows an empty state before anything is saved', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('💾 Saved Deals'));
    await waitFor(() => expect(screen.getByText('No saved deals yet')).toBeInTheDocument());
  });
});

test('no sourcing / FBA functionality is bundled', () => {
  render(<App />);
  expect(screen.queryByText(/Sourcing/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Keepa/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/ASIN/i)).not.toBeInTheDocument();
});
