/**
 * Unit tests for SearchableSelect component.
 *
 * Tests: rendering, dropdown open/close, live keyword filtering,
 * option selection (onChange callback), emptyLabel option,
 * keyboard accessibility, click-outside to close.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchableSelect from '../SearchableSelect';

const SAMPLE_OPTIONS = [
  { value: '1', label: 'Engineering' },
  { value: '2', label: 'Marketing' },
  { value: '3', label: 'Finance' },
];

function renderSelect(props = {}) {
  const defaults = {
    options: SAMPLE_OPTIONS,
    value: '',
    onChange: vi.fn(),
    placeholder: 'Select...',
  };
  return render(<SearchableSelect {...defaults} {...props} />);
}

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------

describe('SearchableSelect — initial render', () => {
  it('renders the placeholder when no value is selected', () => {
    renderSelect({ value: '' });
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('renders the selected option label when a value is set', () => {
    renderSelect({ value: '2' });
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('does not show the dropdown list initially', () => {
    renderSelect();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    // No list items should be visible before clicking
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
  });

  it('shows the down-arrow indicator when closed', () => {
    renderSelect();
    expect(screen.getByText('▼')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Dropdown open / close
// ---------------------------------------------------------------------------

describe('SearchableSelect — dropdown open and close', () => {
  it('opens the dropdown when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByText('Select...'));
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('shows the up-arrow indicator when open', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByText('Select...'));
    expect(screen.getByText('▲')).toBeInTheDocument();
  });

  it('closes the dropdown when the trigger is clicked again', async () => {
    const user = userEvent.setup();
    renderSelect();
    const trigger = screen.getByText('Select...');
    await user.click(trigger);
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
  });

  it('opens and closes with Enter key on the trigger', async () => {
    const user = userEvent.setup();
    renderSelect();
    const trigger = screen.getByText('Select...').closest('[tabindex]');
    await user.click(trigger); // focus it first
    // close by keyboard Enter
    fireEvent.keyDown(trigger, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    });
  });

  it('opens with Space key on the trigger', async () => {
    renderSelect();
    const trigger = screen.getByText('Select...').closest('[tabindex]');
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

describe('SearchableSelect — keyword filtering', () => {
  it('filters options as the user types in the search box', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByText('Select...'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'eng');

    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.queryByText('Marketing')).not.toBeInTheDocument();
    expect(screen.queryByText('Finance')).not.toBeInTheDocument();
  });

  it('is case-insensitive when filtering', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByText('Select...'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'MARKET');

    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
  });

  it('shows "No results" message when nothing matches', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByText('Select...'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'zzznomatch');

    expect(screen.getByText(/No results for/i)).toBeInTheDocument();
  });

  it('shows all options after clearing the search', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByText('Select...'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'eng');
    expect(screen.queryByText('Marketing')).not.toBeInTheDocument();

    await user.clear(searchInput);
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('clears search text when the dropdown is closed then reopened', async () => {
    const user = userEvent.setup();
    const { container } = renderSelect();
    const trigger = container.querySelector('.ss-trigger');

    await user.click(trigger);
    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'eng');
    expect(screen.queryByText('Marketing')).not.toBeInTheDocument();

    // Close by clicking outside (triggers the mousedown outside handler)
    await user.click(document.body);
    // Re-open
    await user.click(trigger);

    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// onChange callback
// ---------------------------------------------------------------------------

describe('SearchableSelect — onChange callback', () => {
  it('calls onChange with the selected option value when an item is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSelect({ onChange });

    await user.click(screen.getByText('Select...'));
    await user.click(screen.getByText('Finance'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('closes the dropdown after a selection', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByText('Select...'));
    await user.click(screen.getByText('Marketing'));

    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
  });

  it('marks the currently selected option with ss-selected class', async () => {
    const user = userEvent.setup();
    renderSelect({ value: '1' });
    await user.click(screen.getByText('Engineering'));

    const options = document.querySelectorAll('.ss-option');
    const engineeringOption = Array.from(options).find(el => el.textContent === 'Engineering');
    expect(engineeringOption).toHaveClass('ss-selected');
  });
});

// ---------------------------------------------------------------------------
// emptyLabel (clear / "none" option)
// ---------------------------------------------------------------------------

describe('SearchableSelect — emptyLabel prop', () => {
  it('renders the emptyLabel option at the top of the list when provided', async () => {
    const user = userEvent.setup();
    renderSelect({ emptyLabel: '— None —' });
    await user.click(screen.getByText('Select...'));

    const listItems = screen.getAllByRole('listitem');
    expect(listItems[0]).toHaveTextContent('— None —');
  });

  it('does not render an empty option when emptyLabel is not provided', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByText('Select...'));

    // Only 3 regular items, no extra "none" entry
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('calls onChange with empty string when the emptyLabel option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSelect({ emptyLabel: 'No selection', onChange });
    await user.click(screen.getByText('Select...'));
    await user.click(screen.getByText('No selection'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('marks the emptyLabel option as selected when value is falsy', async () => {
    const user = userEvent.setup();
    renderSelect({ emptyLabel: 'None', value: '' });
    await user.click(screen.getByText('Select...'));

    const emptyOption = screen.getByText('None').closest('li');
    expect(emptyOption).toHaveClass('ss-selected');
  });

  it('does not mark emptyLabel as selected when a real value is selected', async () => {
    const user = userEvent.setup();
    const { container } = renderSelect({ emptyLabel: 'None', value: '2' });
    // Marketing is already selected — open the dropdown via the trigger div
    const trigger = container.querySelector('.ss-trigger');
    await user.click(trigger);

    const emptyOption = screen.getByText('None').closest('li');
    expect(emptyOption).not.toHaveClass('ss-selected');
  });
});

// ---------------------------------------------------------------------------
// Click outside to close
// ---------------------------------------------------------------------------

describe('SearchableSelect — click outside to close', () => {
  it('closes the dropdown when clicking outside the component', async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByText('Select...'));
    expect(screen.getByText('Engineering')).toBeInTheDocument();

    // Click somewhere outside the component
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Rendering with different option sets
// ---------------------------------------------------------------------------

describe('SearchableSelect — edge cases', () => {
  it('renders with an empty options array without crashing', async () => {
    const user = userEvent.setup();
    renderSelect({ options: [] });
    await user.click(screen.getByText('Select...'));
    expect(screen.getByText(/No results for/i)).toBeInTheDocument();
  });

  it('matches options whose labels contain the search substring anywhere', async () => {
    const user = userEvent.setup();
    renderSelect({
      options: [
        { value: 'a', label: 'Alpha Team' },
        { value: 'b', label: 'Team Beta' },
        { value: 'c', label: 'Gamma' },
      ],
    });
    await user.click(screen.getByText('Select...'));
    await user.type(screen.getByPlaceholderText('Search...'), 'Team');

    expect(screen.getByText('Alpha Team')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
  });
});
