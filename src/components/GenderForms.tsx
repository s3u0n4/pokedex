import type { GenderArt } from '../types';

// 수컷·암컷 모습을 나란히 보여준다 (이로치 버튼을 따른다)
export default function GenderForms({ art, shiny, name }: { art: GenderArt; shiny: boolean; name: string }) {
  const sides = [
    { key: 'male', sign: '♂', label: '수컷', img: art.male },
    { key: 'female', sign: '♀', label: '암컷', img: art.female },
  ] as const;
  return (
    <div className="genders">
      {sides.map((g) => (
        <figure className={`gender ${g.key}`} key={g.key}>
          <img src={g.img[shiny ? 1 : 0]} alt={`${name} ${g.label}`} loading="lazy" />
          <figcaption><b>{g.sign}</b> {g.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
