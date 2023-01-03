#pragma once
#include "packet_handler_base.hpp"

namespace IocpGameServer {

	class Error : public PacketHandlerBase {
	public:
		static const unsigned char kProtocol = 0;
		virtual void handle(std::shared_ptr<User> user, std::string data);
	};

} //namespace IocpGameServer