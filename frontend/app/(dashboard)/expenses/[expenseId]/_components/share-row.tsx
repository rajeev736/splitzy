"use client"

import { Amount } from "@/components/shared/amount"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import type { ExpenseShare } from "@/lib/types"

/** One participant's share in the expense detail list (view & details only). */
export function ShareRow({
  share,
  isMe,
  isPayer,
}: {
  share: ExpenseShare
  isMe: boolean
  isPayer: boolean
}) {
  return (
    <Item className="px-0">
      <ItemMedia>
        <UserAvatar src={share.userPhoto} name={share.userName} size="md" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="text-sm font-medium">
          <span className="truncate">{share.userName}</span>
          {isMe && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
          {isPayer && (
            <span className="text-xs font-normal text-muted-foreground">· Payer</span>
          )}
        </ItemTitle>
        <ItemDescription className="text-xs text-muted-foreground">
          {isPayer ? "Paid full bill" : "Split participant"}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Amount paise={share.amountPaise} className="text-sm font-semibold tabular-nums" />
      </ItemActions>
    </Item>
  )
}
