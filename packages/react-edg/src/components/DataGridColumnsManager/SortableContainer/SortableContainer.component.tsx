import { SortableContext } from '@dnd-kit/sortable';

import { Styled } from './SortableContainer.styles';

import type { PropsWithChildren } from 'react';

export const SortableContainer: React.FC<PropsWithChildren> = ({ children }) => {
  const items = children instanceof Array ? children.map((child) => child.key) : [];

  return (
    <SortableContext items={items}>
      <Styled.Container>{children}</Styled.Container>
    </SortableContext>
  );
};
