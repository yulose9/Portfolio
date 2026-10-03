import type { WebsiteContent } from "../../cms/website";
import AvatarZoom from "./AvatarZoom";
import ToolRow from "./ToolRow";
import TabbedIndex from "./TabbedIndex";
export default function PortfolioContent({ content }: { content: WebsiteContent }) {
  const { profile } = content;
  return <><div className="pb-8"><AvatarZoom alt={profile.name} src={profile.photo}/></div><div className="flex flex-col items-start gap-12"><header className="flex flex-col items-start gap-1"><h1 data-cursor="text" className="m-0 text-balance text-base font-medium leading-6 text-black">{profile.name}</h1><p data-cursor="text" className="m-0 text-base font-normal leading-6 text-black">{profile.rolePrefix}{" "}<a href={profile.employerUrl || undefined} target="_blank" rel="noreferrer" className="text-black underline">{profile.employer}</a></p><ToolRow tools={content.tools.filter(tool => !tool.hidden)}/></header><TabbedIndex tabs={content.tabs.filter(tab => !tab.hidden)}/></div></>;
}
