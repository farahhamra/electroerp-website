import type { Business, Diagnostic } from '../config/contracts'
import { diagnostic } from '../config/diagnostics'
export function validateBusiness(business: Business): Diagnostic[] {
  const out: Diagnostic[] = []
  for (const key of ['contacts', 'locations'] as const) {
    const seen = new Set<string>()
    business[key].forEach((v, i) => {
      if (seen.has(v.id))
        out.push(
          diagnostic('business.duplicate_id', ['business', key, i, 'id'], 'IDs must be unique'),
        )
      seen.add(v.id)
    })
  }
  business.contacts.forEach((contact, i) => {
    const valid =
      contact.kind === 'email'
        ? /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(contact.value)
        : /^\+[1-9]\d{6,14}$/.test(contact.value.replace(/[\s().-]/g, ''))
    if (!valid)
      out.push(
        diagnostic(
          'business.invalid_contact',
          ['business', 'contacts', i, 'value'],
          'Use a valid email or international phone number',
        ),
      )
  })
  business.locations.forEach((location, i) => {
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
    const timeline = weekdays
      .flatMap((day, d) => {
        const h = location.hours[day]
        if (!h || h.closed) return []
        const ranges = h.allDay ? [{ start: '00:00', end: '00:00', nextDay: true }] : h.intervals
        return ranges.map((v) => ({
          day,
          start: d * 1440 + Number(v.start.slice(0, 2)) * 60 + Number(v.start.slice(3)),
          end:
            d * 1440 +
            Number(v.end.slice(0, 2)) * 60 +
            Number(v.end.slice(3)) +
            (v.nextDay ? 1440 : 0),
        }))
      })
      .sort((a, b) => a.start - b.start)
    for (let n = 0; n < timeline.length; n++) {
      const next = timeline[(n + 1) % timeline.length]
      if (next && timeline[n].end > next.start + (n === timeline.length - 1 ? 10080 : 0))
        out.push(
          diagnostic(
            'business.hours_overlap',
            ['business', 'locations', i, 'hours', timeline[n].day],
            'Opening intervals overlap the following day',
          ),
        )
    }
    for (const field of ['hours', 'exceptions'] as const)
      for (const [day, hours] of Object.entries(location[field])) {
        const path = ['business', 'locations', i, field, day]
        if (
          (hours.closed && hours.allDay) ||
          ((hours.closed || hours.allDay) && hours.intervals.length)
        )
          out.push(
            diagnostic(
              'business.conflicting_hours',
              path,
              'Closed/all-day states cannot contain intervals',
            ),
          )
        const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
        const intervals = hours.intervals
          .map((v, index) => ({
            start: minutes(v.start),
            end: minutes(v.end) + (v.nextDay ? 1440 : 0),
            index,
          }))
          .sort((a, b) => a.start - b.start)
        intervals.forEach((v, n) => {
          if (
            v.end <= v.start ||
            v.end - v.start > 1440 ||
            (n > 0 && v.start < intervals[n - 1].end)
          )
            out.push(
              diagnostic(
                'business.invalid_hours',
                [...path, 'intervals', v.index],
                'Intervals must be positive, at most 24 hours, and not overlap',
              ),
            )
        })
        if (
          field === 'exceptions' &&
          (!Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day)
        )
          out.push(diagnostic('business.invalid_date', path, 'Use a real calendar date'))
      }
  })
  return out
}
