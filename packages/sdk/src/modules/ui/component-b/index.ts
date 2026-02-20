export interface CardProps {
  title: string;
  content?: string;
}

export function Card(props: CardProps): string {
  return `<div class="card"><h3>${props.title}</h3>${props.content ?? ''}</div>`;
}
