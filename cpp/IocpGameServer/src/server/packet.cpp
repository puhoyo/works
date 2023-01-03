#include "include/packet.hpp"
#include <iostream>

namespace IocpGameServer {

	Packet::Packet() : kRwMode(kReadMode) {
		memset(&overlapped_, 0, sizeof(OVERLAPPED));
		wsa_buf_.buf = new char[kRecvSize];
		memset(wsa_buf_.buf, 0, kRecvSize);
		wsa_buf_.len = kRecvSize - 1;
	}
	Packet::Packet(const std::string& data) : kRwMode(kWriteMode) {
		memset(&overlapped_, 0, sizeof(OVERLAPPED));
		wsa_buf_.buf = new char[kSendSize];
		strcpy_s(wsa_buf_.buf, kSendSize, data.c_str());
		wsa_buf_.len = static_cast<ULONG>(strlen(wsa_buf_.buf));
	}
	std::string Packet::GetPacketData() const {
		if (strlen(wsa_buf_.buf) > 1)
			return &wsa_buf_.buf[1];
		else
			return "";
	}
}