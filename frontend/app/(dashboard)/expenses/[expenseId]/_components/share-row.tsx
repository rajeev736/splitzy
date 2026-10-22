"use client"

import { Amount } from "@/components/shared/amount"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
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
        <ItemTitle className="text-xs font-bold">
          <span className="truncate">{share.userName}</span>
          {isMe && <span className="text-[10px] font-semibold text-primary">(You)</span>}
          {isPayer && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold">
              Payer
            </Badge>
          )}
        </ItemTitle>
        <ItemDescription className="text-[11px] text-muted-foreground">
          {isPayer ? "Paid full bill" : "Split participant"}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Amount paise={share.amountPaise} className="text-xs font-bold sm:text-sm" />
      </ItemActions>
    </Item>
  )
}
