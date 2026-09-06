import { ValidationError } from "@devpulse/core";

export function testRegex(
  pattern: string,
  flags: string,
  text: string,
): {
  isValid: boolean;
  matchesCount: number;
  matches: Array<{ match: string; index?: number; groups?: Record<string, string> }>;
} {
  try {
    const cleanFlags = flags.replace(/[^gimsuy]/g, "");
    // Always include 'g' for matchAll
    const effectiveFlags = cleanFlags.includes("g") ? cleanFlags : `${cleanFlags}g`;
    const regex = new RegExp(pattern, effectiveFlags);
    const matchesArray = [...text.matchAll(regex)];

    return {
      isValid: true,
      matchesCount: matchesArray.length,
      matches: matchesArray.slice(0, 10).map((m) => ({
        match: m[0],
        index: m.index,
        groups: m.groups,
      })),
    };
  } catch (err: any) {
    throw new ValidationError(`Invalid regular expression: ${err.message}`);
  }
}

export const GitCheatSheet: Record<string, string> = {
  undo_commit:
    "git reset --soft HEAD~1  # Keeps changes staged\ngit reset HEAD~1        # Keeps changes unstaged",
  discard_local:
    "git restore .             # Discard working tree changes\ngit clean -fd             # Remove untracked files and directories",
  rename_branch: "git branch -m <new-name>  # Rename current branch",
  squash_commits: "git rebase -i HEAD~<N>   # Interactively squash the last N commits",
  cherry_pick: "git cherry-pick <commit-hash> # Apply a commit to the current branch",
  stash_work:
    "git stash push -m 'wip'   # Stash with message\ngit stash pop              # Restore stashed work",
  force_push_safe: "git push --force-with-lease # Push safely without overwriting teammate commits",
  show_history: "git log --oneline --graph --decorate --all # Beautiful visual graph",
};

export const DockerCheatSheet: Record<string, string> = {
  cleanup_all:
    "docker system prune -a --volumes # Remove unused containers, networks, images, volumes",
  logs_follow: "docker logs -f --tail 100 <container-id>",
  exec_bash: "docker exec -it <container-id> /bin/sh",
  inspect_ip:
    "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container>",
  stop_all: "docker stop $(docker ps -q)",
  stats: "docker stats --no-stream # View real-time resource utilization snapshot",
};

export const LinuxCheatSheet: Record<string, string> = {
  port_usage: "lsof -i :<port>   # Or: ss -tulpn | grep :<port>",
  disk_usage: "df -h            # Disk free\ndu -sh * | sort -h # Folder sizes",
  memory_usage: "free -h",
  find_large_files: "find / -xdev -type f -size +100M -exec ls -la {} + 2>/dev/null",
  kill_process: "kill -9 <PID>   # Or: killall -9 <name>",
  systemd_status: "systemctl status <service>\njournalctl -u <service> -f",
};
