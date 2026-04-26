import { Link } from "@tanstack/react-router";
import { Star, Lock, Crown, BookOpen, Music, MessageCircle } from "lucide-react";

type LessonState = "done" | "current" | "locked";
type LessonKind = "verse" | "praise" | "speak" | "milestone";

export interface Lesson {
  day: number;
  title: string;
  state: LessonState;
  kind: LessonKind;
}

const kindIcon: Record<LessonKind, React.ReactNode> = {
  verse: <BookOpen className="size-7" />,
  praise: <Music className="size-7" />,
  speak: <MessageCircle className="size-7" />,
  milestone: <Crown className="size-8" />,
};

export function JourneyPath({ lessons }: { lessons: Lesson[] }) {
  return (
    <div className="relative py-6">
      {lessons.map((lesson, i) => {
        // zig-zag offset
        const offsets = [0, 60, 90, 60, 0, -60, -90, -60];
        const x = offsets[i % offsets.length];
        return (
          <div
            key={lesson.day}
            className="flex justify-center my-2"
            style={{ transform: `translateX(${x}px)` }}
          >
            <LessonNode lesson={lesson} />
          </div>
        );
      })}
    </div>
  );
}

function LessonNode({ lesson }: { lesson: Lesson }) {
  const isLocked = lesson.state === "locked";
  const isCurrent = lesson.state === "current";
  const isDone = lesson.state === "done";
  const isMilestone = lesson.kind === "milestone";

  const base =
    "relative flex flex-col items-center justify-center rounded-full font-bold transition-transform active:translate-y-1 active:shadow-none";
  const size = isMilestone ? "size-24" : "size-20";

  let style = "";
  if (isDone) style = "bg-success text-success-foreground shadow-chunky-success";
  else if (isCurrent) style = "bg-gradient-hero text-primary-foreground shadow-chunky animate-pop-in";
  else if (isMilestone) style = "bg-gradient-gold text-white shadow-chunky-gold";
  else style = "bg-locked text-muted-foreground shadow-chunky-locked";

  const inner = (
    <button
      className={`${base} ${size} ${style}`}
      disabled={isLocked && !isMilestone}
      aria-label={`Dia ${lesson.day}: ${lesson.title}`}
    >
      {isLocked ? <Lock className="size-6" /> : kindIcon[lesson.kind]}
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-card text-foreground text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow border border-border whitespace-nowrap">
          COMECE
        </span>
      )}
      {isDone && (
        <Star className="absolute -bottom-1 -right-1 size-5 fill-gold text-gold drop-shadow" />
      )}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      {isLocked ? (
        inner
      ) : (
        <Link to="/lesson/$day" params={{ day: String(lesson.day) }}>
          {inner}
        </Link>
      )}
      <span className={`text-[11px] font-bold ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>
        Dia {lesson.day}
      </span>
    </div>
  );
}
