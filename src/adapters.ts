export interface InstructorCell { cell: HTMLElement; names: string[] }
function names(cell: HTMLElement): string[] {
  const copy = cell.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[data-njitxrmp]').forEach(node => node.remove());
  copy.querySelectorAll('a').forEach(a => { a.before('\n'); a.after('\n'); });
  copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  copy.querySelectorAll('div,p,li').forEach(block => { block.before('\n'); block.after('\n'); });
  const values = (copy.textContent ?? '').split(/[\n;]/);
  return [...new Set(values.map(value => value.replace(/\((?:Primary|Secondary)\)/gi, '').replace(/\s+/g, ' ').trim()).filter(value => value.length > 2 && !/^(tba|staff|instructor|to be announced|not assigned)$/i.test(value)))];
}
function tableCells(root: ParentNode): InstructorCell[] {
  const result: InstructorCell[] = [];
  for (const table of root.querySelectorAll('table')) {
    const rows = [...table.querySelectorAll('tr')].filter(row => row.closest('table') === table);
    const header = rows.find(row => [...row.children].some(c => /^(instructor|instructors|faculty)$/i.test(c.textContent?.trim() ?? '')));
    const index = header ? [...header.children].findIndex(c => /^(instructor|instructors|faculty)$/i.test(c.textContent?.trim() ?? '')) : -1;
    for (const row of rows) {
      if (row === header || row.closest('table') !== table) continue;
      const cell = row.querySelector<HTMLElement>('td[data-property="instructor"],td[data-property="instructors"],td[data-name="instructor"]') ?? (index >= 0 ? row.children[index] as HTMLElement : null);
      if (cell?.tagName === 'TD') { const found = names(cell); if (found.length) result.push({ cell, names: found }); }
    }
  }
  return result;
}
export function schedulerAdapter(doc: Document): InstructorCell[] {
  const containers = doc.querySelectorAll('#pbid-courseListSectionDetail, #pbid-instructorListSectionDetail');
  return containers.length ? [...containers].flatMap(tableCells) : tableCells(doc);
}
export function plannerAdapter(doc: Document): InstructorCell[] { return tableCells(doc); }
