"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// 아래에서 올라오는 시트. Base UI Drawer를 dialog.tsx와 같은 모양의 API로 감쌌다.
// 아래로 끌어내리면 닫힌다(swipeDirection 기본값 "down").

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

// 시트 바닥이 화면 아래로 조금 더 이어지게 둔다(bleed). 위로 끌어올릴 때
// 시트 밑이 비어 보이지 않게 하려는 것으로, 그만큼 아래 여백에 더해 준다.
const BLEED = "[--bleed:3rem]"
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]"

function DrawerContent({
  className,
  children,
  showCloseButton = true,
  keyboardAware = false,
  ...props
}: DrawerPrimitive.Popup.Props & {
  showCloseButton?: boolean
  // 입력창이 든 시트. 모바일 키보드가 올라오면 초점 맞은 칸이 가려지지 않게 스크롤을 맞춘다.
  keyboardAware?: boolean
}) {
  const portal = (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        data-slot="drawer-overlay"
        className={cn(
          "fixed inset-0 z-50 min-h-dvh bg-black [--backdrop-opacity:0.25] dark:[--backdrop-opacity:0.6]",
          "opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress)))]",
          "transition-opacity duration-[450ms] data-starting-style:opacity-0 data-ending-style:opacity-0 data-swiping:duration-0",
          "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:absolute",
          EASE
        )}
      />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            BLEED,
            "relative -mb-(--bleed) flex max-h-[calc(90dvh+var(--bleed))] w-full flex-col rounded-t-[20px] pb-(--bleed) text-sm text-popover-foreground outline-none sm:max-w-2xl",
            // iOS 시트처럼 라이트는 회색 바탕 위에 흰 그룹, 다크는 한 단계 밝은 표면 위에 더 밝은 그룹.
            "bg-background dark:bg-card",
            "[transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[450ms] data-swiping:select-none",
            "data-starting-style:[transform:translateY(calc(100%-var(--bleed)+2px))] data-ending-style:[transform:translateY(calc(100%-var(--bleed)+2px))]",
            "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] motion-reduce:duration-0",
            EASE,
            className
          )}
          {...props}
        >
          {/* 끌어내릴 수 있다는 표시. 스크린 리더에는 의미가 없어 감춘다. */}
          <div
            aria-hidden
            className="mx-auto mt-2 mb-1 h-1.5 w-9 shrink-0 rounded-full bg-muted-foreground/40"
          />
          {children}
          {showCloseButton && (
            <DrawerPrimitive.Close
              data-slot="drawer-close"
              render={
                <Button
                  variant="secondary"
                  className="absolute top-3 right-3 rounded-full"
                  size="icon-sm"
                />
              }
            >
              <XIcon />
              <span className="sr-only">닫기</span>
            </DrawerPrimitive.Close>
          )}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  )

  return keyboardAware ? (
    <DrawerPrimitive.VirtualKeyboardProvider>
      {portal}
    </DrawerPrimitive.VirtualKeyboardProvider>
  ) : (
    portal
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex shrink-0 flex-col gap-1 px-4 pt-2 pr-14", className)}
      {...props}
    />
  )
}

// 시트의 스크롤 본문. Drawer.Content 안에서는 마우스로 글자를 드래그해도 시트가 끌려가지 않아
// 요약 문장을 골라 복사할 수 있다.
function DrawerBody({ className, ...props }: DrawerPrimitive.Content.Props) {
  return (
    <DrawerPrimitive.Content
      data-slot="drawer-body"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "flex shrink-0 items-center gap-2 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]",
        className
      )}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
}
